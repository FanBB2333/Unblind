package parser

import (
	"context"
	"crypto/md5"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/chromedp/chromedp"
)

// ReviewResult represents a single expert review
type ReviewResult struct {
	ExpertName        string `json:"expertName"`
	ReviewTime        string `json:"reviewTime"`
	OverallEvaluation string `json:"overallEvaluation"`
	ReviewResult      string `json:"reviewResult"`
	Remark            string `json:"remark"`
}

// ParsedResults represents the complete parsed results
type ParsedResults struct {
	Reviews     []ReviewResult `json:"reviews"`
	FinalResult string         `json:"finalResult"`
	ExtractTime string         `json:"extractTime"`
	Hash        string         `json:"hash"`
}

// Parser handles DOM parsing for review results
type Parser struct{}

// NewParser creates a new parser
func NewParser() *Parser {
	return &Parser{}
}

// ExtractResults extracts review results from the current page
// This function should be called when the browser is on the target page
func (p *Parser) ExtractResults(ctx context.Context) (*ParsedResults, error) {
	results := &ParsedResults{
		Reviews:     []ReviewResult{},
		ExtractTime: time.Now().Format(time.RFC3339),
	}

	// JavaScript to extract table data
	// Based on the Python script, the page has ant-table-content elements
	// The second one (if exists) contains the review results
	extractJS := `
	(function() {
		const tables = document.querySelectorAll('.ant-table-content');
		let table = null;
		
		// If there are 2+ tables, use the second one (first is research achievements)
		// Otherwise use the first one
		if (tables.length >= 2) {
			table = tables[1];
		} else if (tables.length === 1) {
			table = tables[0];
		}
		
		if (!table) {
			return JSON.stringify({ reviews: [], finalResult: '', error: 'No table found' });
		}
		
		const reviews = [];
		const rows = table.querySelectorAll('tbody.ant-table-tbody tr');
		
		for (const row of rows) {
			const cells = row.querySelectorAll('td');
			if (cells.length >= 5) {
				reviews.push({
					expertName: cells[0].innerText.trim(),
					reviewTime: cells[1].innerText.trim(),
					overallEvaluation: cells[2].innerText.trim(),
					reviewResult: cells[3].innerText.trim(),
					remark: cells[4].innerText.trim()
				});
			}
		}
		
		// Try to get final result from table footer
		let finalResult = '';
		try {
			// First try to find footer within the same ant-table container
			const tableRoot = table.closest('.ant-table');
			if (tableRoot) {
				const footer = tableRoot.querySelector('.ant-table-footer');
				if (footer) {
					finalResult = footer.innerText.trim();
				}
			}
			
			// Fallback: look for all footers
			if (!finalResult) {
				const footers = document.querySelectorAll('.ant-table-footer');
				if (footers.length >= 2 && tables.length >= 2) {
					finalResult = footers[1].innerText.trim();
				} else if (footers.length > 0) {
					finalResult = footers[0].innerText.trim();
				}
			}
		} catch (e) {
			// Ignore footer extraction errors
		}
		
		return JSON.stringify({ reviews: reviews, finalResult: finalResult, error: null });
	})()
	`

	var resultJSON string
	err := chromedp.Run(ctx,
		// Wait for table to be present
		chromedp.WaitVisible(`.ant-table-content`, chromedp.ByQuery),
		// Give some time for data to load
		chromedp.Sleep(1*time.Second),
		// Extract the data
		chromedp.Evaluate(extractJS, &resultJSON),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to extract results: %w", err)
	}

	// Parse the JSON result
	var extractedData struct {
		Reviews     []ReviewResult `json:"reviews"`
		FinalResult string         `json:"finalResult"`
		Error       string         `json:"error"`
	}

	if err := json.Unmarshal([]byte(resultJSON), &extractedData); err != nil {
		return nil, fmt.Errorf("failed to parse extracted data: %w", err)
	}

	if extractedData.Error != "" && extractedData.Error != "null" {
		return nil, fmt.Errorf("extraction error: %s", extractedData.Error)
	}

	results.Reviews = extractedData.Reviews
	results.FinalResult = extractedData.FinalResult
	results.Hash = p.calculateHash(results)

	return results, nil
}

// calculateHash computes a hash of the results for comparison
func (p *Parser) calculateHash(results *ParsedResults) string {
	// Only hash the review content, not the extraction time
	content := ""
	for _, r := range results.Reviews {
		content += r.ExpertName + r.ReviewTime + r.OverallEvaluation + r.ReviewResult + r.Remark
	}
	content += results.FinalResult

	hash := md5.Sum([]byte(content))
	return hex.EncodeToString(hash[:])
}

// FormatNotificationBody formats the results for notification
func (p *Parser) FormatNotificationBody(results *ParsedResults) string {
	var lines []string

	for i, review := range results.Reviews {
		// Format: 专家1: A（优秀）（同意答辩）
		line := fmt.Sprintf("专家%d: %s（%s）", i+1, review.OverallEvaluation, review.ReviewResult)
		lines = append(lines, line)
	}

	if results.FinalResult != "" {
		lines = append(lines, results.FinalResult)
	}

	return strings.Join(lines, "\n")
}

// HasResults checks if there are any review results
func (p *Parser) HasResults(results *ParsedResults) bool {
	return results != nil && len(results.Reviews) > 0
}

// ResultsChanged checks if results have changed compared to previous hash
func (p *Parser) ResultsChanged(current *ParsedResults, previousHash string) bool {
	if current == nil {
		return false
	}
	return current.Hash != previousHash
}
