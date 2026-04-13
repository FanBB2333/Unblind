#!/usr/bin/env python3
"""
盲审结果监控程序
使用 Selenium 定时刷新页面，检测盲审结果变化，并通过 Bark API 发送通知
"""

import os
import time
import json
import pickle
import hashlib
import requests
from datetime import datetime
from pathlib import Path
from urllib.parse import quote

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import (
    TimeoutException,
    NoSuchElementException,
    WebDriverException,
)

# 学号和密码填充，可以留空，在弹出的页面中登录即可
os.environ["ZJUAM_ACCOUNT"] = "" 
os.environ["ZJUAM_PASSWORD"] = ""
# ==================== 配置 ====================
TARGET_URL = "https://yjsy.zju.edu.cn/dashboard/workplace?dm=xw_sqzt&mode=2&role=1&back=dashboard"
LOGIN_URL = "https://zjuam.zju.edu.cn/cas/login"
COOKIES_FILE = Path(__file__).parent / "cookies.pkl"
RESULT_CACHE_FILE = Path(__file__).parent / "last_result.json"

# Bark API 配置
BARK_API_BASE = "https://api.day.app/xxxx" #这里可以换为你的bark API配置

# 刷新间隔（秒）
REFRESH_INTERVAL = 300  # 5分钟

# 等待元素超时时间（秒）
ELEMENT_TIMEOUT = 20


def send_bark_notification(title: str, body: str) -> bool:
    """通过 Bark API 发送通知"""
    try:
        # URL 编码标题和内容
        encoded_title = quote(title)
        encoded_body = quote(body)
        url = f"{BARK_API_BASE}/{encoded_title}/{encoded_body}"
        response = requests.get(url, timeout=10)
        if response.status_code == 200:
            print(f"[{datetime.now()}] 通知发送成功: {title}")
            return True
        else:
            print(f"[{datetime.now()}] 通知发送失败: {response.status_code}")
            return False
    except Exception as e:
        print(f"[{datetime.now()}] 发送通知时出错: {e}")
        return False


def setup_driver() -> webdriver.Chrome:
    """设置并返回 Chrome WebDriver"""
    options = webdriver.ChromeOptions()
    # 可以根据需要添加更多选项
    # options.add_argument("--headless")  # 无头模式
    options.add_argument("--disable-gpu")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--window-size=1920,1080")
    
    driver = webdriver.Chrome(options=options)
    return driver


def save_cookies(driver: webdriver.Chrome) -> None:
    """保存当前 cookies 到文件"""
    cookies = driver.get_cookies()
    with open(COOKIES_FILE, "wb") as f:
        pickle.dump(cookies, f)
    print(f"[{datetime.now()}] Cookies 已保存")


def load_cookies(driver: webdriver.Chrome) -> bool:
    """从文件加载 cookies"""
    if not COOKIES_FILE.exists():
        print(f"[{datetime.now()}] 未找到保存的 cookies")
        return False
    
    try:
        with open(COOKIES_FILE, "rb") as f:
            cookies = pickle.load(f)
        
        # 先访问目标域名以设置 cookies
        driver.get("https://yjsy.zju.edu.cn")
        time.sleep(2)
        
        for cookie in cookies:
            try:
                # 移除可能导致问题的字段
                if "expiry" in cookie:
                    del cookie["expiry"]
                driver.add_cookie(cookie)
            except Exception as e:
                print(f"[{datetime.now()}] 添加 cookie 时出错: {e}")
        
        print(f"[{datetime.now()}] Cookies 已加载")
        return True
    except Exception as e:
        print(f"[{datetime.now()}] 加载 cookies 失败: {e}")
        return False


def perform_login(driver: webdriver.Chrome) -> bool:
    """执行登录操作"""
    print(f"[{datetime.now()}] 开始登录流程...")
    
    # 获取环境变量中的账号密码
    username = os.environ.get("ZJUAM_ACCOUNT", "")
    password = os.environ.get("ZJUAM_PASSWORD", "")
    
    try:
        # 等待用户名输入框出现
        username_input = WebDriverWait(driver, ELEMENT_TIMEOUT).until(
            EC.presence_of_element_located((By.ID, "username"))
        )
        password_input = driver.find_element(By.ID, "password")
        
        # 检查输入框是否为空，如果为空则填充环境变量中的值
        if not username_input.get_attribute("value"):
            if username:
                username_input.clear()
                username_input.send_keys(username)
                print(f"[{datetime.now()}] 已填充用户名")
            else:
                print(f"[{datetime.now()}] 未设置 ZJUAM_ACCOUNT 环境变量")
        
        if not password_input.get_attribute("value"):
            if password:
                password_input.clear()
                password_input.send_keys(password)
                print(f"[{datetime.now()}] 已填充密码")
            else:
                print(f"[{datetime.now()}] 未设置 ZJUAM_PASSWORD 环境变量")
        
        # 等待用户修正（10秒）
        print(f"[{datetime.now()}] 等待10秒，请检查并修正登录信息...")
        time.sleep(10)
        
        # 点击登录按钮
        login_button = driver.find_element(By.ID, "dl")
        login_button.click()
        print(f"[{datetime.now()}] 已点击登录按钮")
        
        # 等待登录完成（页面跳转）
        time.sleep(5)
        
        # 登录后需要重新加载目标页面
        driver.get(TARGET_URL)
        time.sleep(3)
        
        # 保存 cookies
        save_cookies(driver)
        
        return True
        
    except TimeoutException:
        print(f"[{datetime.now()}] 等待登录元素超时")
        return False
    except Exception as e:
        print(f"[{datetime.now()}] 登录过程出错: {e}")
        return False


def check_login_required(driver: webdriver.Chrome) -> bool:
    """检查是否需要登录"""
    try:
        # 检查是否存在登录表单
        driver.find_element(By.ID, "username")
        return True
    except NoSuchElementException:
        return False


def is_on_target_page(driver: webdriver.Chrome) -> bool:
    """检查是否在目标页面"""
    try:
        current_url = driver.current_url
        # 检查 URL 是否包含目标页面的关键字
        if "yjsy.zju.edu.cn" in current_url and "xw_sqzt" in current_url:
            return True
        # 也可以通过检查页面元素确认
        if "yjsy.zju.edu.cn" in current_url:
            # 尝试查找盲审相关的表格
            try:
                driver.find_element(By.CLASS_NAME, "ant-table-content")
                return True
            except NoSuchElementException:
                pass
        return False
    except Exception:
        return False


def wait_for_target_page(driver: webdriver.Chrome, timeout: int = 30) -> bool:
    """等待目标页面加载完成"""
    start_time = time.time()
    while time.time() - start_time < timeout:
        if is_on_target_page(driver):
            print(f"[{datetime.now()}] 已到达目标页面")
            return True
        if check_login_required(driver):
            print(f"[{datetime.now()}] 检测到需要登录")
            return False
        time.sleep(1)
    print(f"[{datetime.now()}] 等待目标页面超时")
    return False


def extract_review_results(driver: webdriver.Chrome) -> dict:
    """从页面 DOM 提取盲审结果"""
    results = {
        "reviews": [],
        "final_result": "",
        "extract_time": datetime.now().isoformat()
    }
    
    try:
        # 等待表格加载
        WebDriverWait(driver, ELEMENT_TIMEOUT).until(
            EC.presence_of_element_located((By.CLASS_NAME, "ant-table-content"))
        )
        time.sleep(2)  # 额外等待确保数据加载完成
        
        # 查找表格内容：
        # - 老页面：通常只有 1 个 ant-table-content（即评审意见）
        # - 新页面：会有 2 个 ant-table-content（第一个为科研成果，第二个才为评审意见）
        tables = driver.find_elements(By.CLASS_NAME, "ant-table-content")
        table = None
        if len(tables) < 2:
            print(f"[{datetime.now()}] 警告：未找到第二个表格内容区域，尝试使用第一个")
            table = tables[0] if tables else None
        else:
            # 选择第二个表格
            table = tables[1]
            print(f"[{datetime.now()}] 已定位到第二个 ant-table-content")

        if table is None:
            print(f"[{datetime.now()}] 未找到任何 ant-table-content，无法提取评审结果")
            return None

        # 获取所有行
        rows = table.find_elements(By.CSS_SELECTOR, "tbody.ant-table-tbody tr")  # type: ignore
        
        print(f"[{datetime.now()}] DOM 中找到 {len(rows)} 行数据")
        
        for row in rows:
            cells = row.find_elements(By.TAG_NAME, "td")
            print(f"[{datetime.now()}] 行中有 {len(cells)} 个单元格")
            if len(cells) >= 5:
                review = {
                    "expert_name": cells[0].text.strip(),
                    "review_time": cells[1].text.strip(),
                    "overall_evaluation": cells[2].text.strip(),
                    "review_result": cells[3].text.strip(),
                    "remark": cells[4].text.strip()
                }
                results["reviews"].append(review)
                print(f"[{datetime.now()}] 解析到: 专家={review['expert_name']}, 评价={review['overall_evaluation']}, 结果={review['review_result']}")
        
        # 尝试获取最终判定结果
        try:
            footer_text = ""

            # 优先：从当前选中的表格（评审意见）所在的 ant-table 容器内取 footer，避免页面存在多个表格时取错
            try:
                table_root = table.find_element(
                    By.XPATH,
                    "./ancestor::*[contains(concat(' ', normalize-space(@class), ' '), ' ant-table ')][1]",
                )
                footer = table_root.find_element(By.CLASS_NAME, "ant-table-footer")
                footer_text = footer.text.strip()
            except NoSuchElementException:
                # 兜底：按 DOM 顺序取 footer（若有多个，尽量与 ant-table-content 的选择保持一致）
                footers = driver.find_elements(By.CLASS_NAME, "ant-table-footer")
                if len(footers) >= 2 and len(tables) >= 2:
                    footer_text = footers[1].text.strip()
                elif footers:
                    footer_text = footers[0].text.strip()

            results["final_result"] = footer_text
            if footer_text:
                print(f"[{datetime.now()}] {footer_text}")
        except Exception as e:
            results["final_result"] = ""
            print(f"[{datetime.now()}] 获取最终判定结果失败: {e}")
        
        print(f"[{datetime.now()}] 成功提取 {len(results['reviews'])} 条评审结果")
        
    except TimeoutException:
        print(f"[{datetime.now()}] 等待表格元素超时，可能需要重新登录")
        return None
    except Exception as e:
        print(f"[{datetime.now()}] 提取结果时出错: {e}")
        import traceback
        traceback.print_exc()
        return None
    
    return results


def get_result_hash(results: dict) -> str:
    """计算结果的哈希值，用于比较变化"""
    if not results:
        return ""
    # 只比较关键内容
    content = json.dumps(results["reviews"], ensure_ascii=False, sort_keys=True)
    content += results.get("final_result", "")
    return hashlib.md5(content.encode()).hexdigest()


def load_last_result() -> tuple:
    """加载上次的结果"""
    if not RESULT_CACHE_FILE.exists():
        return None, ""
    
    try:
        with open(RESULT_CACHE_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
            return data.get("results"), data.get("hash", "")
    except Exception as e:
        print(f"[{datetime.now()}] 加载缓存结果失败: {e}")
        return None, ""


def save_result(results: dict, result_hash: str) -> None:
    """保存当前结果"""
    try:
        with open(RESULT_CACHE_FILE, "w", encoding="utf-8") as f:
            json.dump({"results": results, "hash": result_hash}, f, ensure_ascii=False, indent=2)
        print(f"[{datetime.now()}] 结果已缓存")
    except Exception as e:
        print(f"[{datetime.now()}] 保存结果失败: {e}")


def format_notification_body(results: dict) -> str:
    """格式化通知内容：A（优秀）（同意答辩）"""
    lines = []
    
    for i, review in enumerate(results.get("reviews", []), 1):
        overall = review.get("overall_evaluation", "未知")
        result = review.get("review_result", "未知")
        
        # 格式：专家1: A（优秀）（同意答辩）
        line = f"专家{i}: {overall}（{result}）"
        lines.append(line)
    
    if results.get("final_result"):
        lines.append(results["final_result"])
    
    return "\n".join(lines)


def print_results(results: dict) -> None:
    """打印结果到终端"""
    print("\n" + "=" * 60)
    print(f"[{datetime.now()}] 当前盲审结果")
    print("=" * 60)
    
    print("-" * 60)
    
    for i, review in enumerate(results.get("reviews", []), 1):
        print(f"\n【专家{i}】")
        print(f"  总体评价: {review.get('overall_evaluation', '未知')}")
        print(f"  评阅结果: {review.get('review_result', '未知')}")
        print(f"  评阅时间: {review.get('review_time', '无')}")
        print(f"  备注: {review.get('remark', '无')}")
    
    print("-" * 60)
    if results.get("final_result"):
        print(f"{results['final_result']}")
    print("=" * 60 + "\n")


def main():
    """主函数"""
    print(f"[{datetime.now()}] 盲审结果监控程序启动")
    print(f"[{datetime.now()}] 刷新间隔: {REFRESH_INTERVAL}秒")
    
    driver = None
    
    try:
        driver = setup_driver()
        print(f"[{datetime.now()}] WebDriver 已初始化")
        
        # 尝试加载 cookies
        cookies_loaded = load_cookies(driver)
        
        # 访问目标页面
        driver.get(TARGET_URL)
        time.sleep(3)
        
        # 主循环
        while True:
            try:
                # 检查是否需要登录
                if check_login_required(driver):
                    print(f"[{datetime.now()}] 检测到登录页面")
                    if not perform_login(driver):
                        print(f"[{datetime.now()}] 登录失败，等待重试...")
                        time.sleep(60)
                        driver.get(TARGET_URL)
                        continue
                    # 登录后等待页面跳转
                    time.sleep(3)
                
                # 等待并确认到达目标页面
                if not wait_for_target_page(driver, timeout=15):
                    print(f"[{datetime.now()}] 未能到达目标页面，尝试重新加载...")
                    driver.get(TARGET_URL)
                    time.sleep(3)
                    continue
                
                # 额外等待页面数据加载
                time.sleep(2)
                
                # 使用 DOM 方式提取结果
                results = extract_review_results(driver)
                
                if results is None or len(results.get("reviews", [])) == 0:
                    print(f"[{datetime.now()}] 无法获取结果，尝试重新加载页面...")
                    driver.get(TARGET_URL)
                    time.sleep(3)
                    continue
                
                # 打印当前结果到终端
                print_results(results)
                
                # 计算当前结果的哈希
                current_hash = get_result_hash(results)
                
                # 加载上次的结果
                last_results, last_hash = load_last_result()
                
                # 比较是否有变化
                if current_hash != last_hash:
                    print(f"[{datetime.now()}] 检测到结果变化!")
                    
                    # 发送通知
                    title = "盲审结果更新"
                    body = format_notification_body(results)
                    send_bark_notification(title, body)
                    
                    # 保存新结果
                    save_result(results, current_hash)
                else:
                    print(f"[{datetime.now()}] 结果无变化，不发送通知")
                
                # 等待下一次刷新
                print(f"[{datetime.now()}] 等待 {REFRESH_INTERVAL} 秒后刷新...")
                time.sleep(REFRESH_INTERVAL)
                
                # 刷新页面
                driver.refresh()
                time.sleep(3)
                
            except WebDriverException as e:
                print(f"[{datetime.now()}] WebDriver 错误: {e}")
                print(f"[{datetime.now()}] 尝试重新初始化...")
                if driver:
                    try:
                        driver.quit()
                    except:
                        pass
                driver = setup_driver()
                load_cookies(driver)
                driver.get(TARGET_URL)
                time.sleep(3)
                
    except KeyboardInterrupt:
        print(f"\n[{datetime.now()}] 程序被用户中断")
    except Exception as e:
        print(f"[{datetime.now()}] 程序出错: {e}")
        import traceback
        traceback.print_exc()
    finally:
        if driver:
            try:
                driver.quit()
                print(f"[{datetime.now()}] WebDriver 已关闭")
            except:
                pass


if __name__ == "__main__":
    main()
