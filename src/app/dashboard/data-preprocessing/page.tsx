
'use client';

import { useEffect } from 'react';

const DataEditorPage = () => {
  useEffect(() => {
    // This script will be executed on the client side.
    const script = document.createElement('script');
    script.innerHTML = `
      (function() {
        'use strict';
        
        let tableData = { headers: [], rows: [] };
        let selectedCols = new Set();
        let selectedRows = new Set();
        let isModified = false;
        let currentFileName = '';
        let transformHistory = [];
        let pendingFileData = null;

        // Convert table data to CSV
        function tableToCSV() {
          const rows = [tableData.headers, ...tableData.rows];
          return rows.map(row => 
            row.map(cell => {
              const str = String(cell || '');
              if (str.includes(',') || str.includes('"') || str.includes('\\n')) {
                return '"' + str.replace(/"/g, '""') + '"';
              }
              return str;
            }).join(',')
          ).join('\\n');
        }

        function init() {
          setupEventListeners();
          updateStats();
        }

        function setupEventListeners() {
          document.getElementById('fileInput')?.addEventListener('change', handleFileUpload);
          document.getElementById('createSampleBtn')?.addEventListener('click', createSampleData);
          document.getElementById('addRowAboveBtn')?.addEventListener('click', addRowAbove);
          document.getElementById('addRowBelowBtn')?.addEventListener('click', addRowBelow);
          document.getElementById('deleteRowBtn')?.addEventListener('click', deleteSelectedRows);
          document.getElementById('addColLeftBtn')?.addEventListener('click', addColLeft);
          document.getElementById('addColRightBtn')?.addEventListener('click', addColRight);
          document.getElementById('deleteColBtn')?.addEventListener('click', deleteSelectedCols);
          document.getElementById('checkMissingBtn')?.addEventListener('click', checkMissingValues);
          document.getElementById('fillMissingBtn')?.addEventListener('click', fillMissingValues);
          document.getElementById('transformBtn')?.addEventListener('click', applyTransformation);
          document.getElementById('undoTransformBtn')?.addEventListener('click', undoLastTransform);
          document.getElementById('downloadCSVBtn')?.addEventListener('click', downloadCSV);
          document.getElementById('clearAllBtn')?.addEventListener('click', clearAll);
          document.getElementById('searchInput')?.addEventListener('input', applyFilter);
          
          // Modal buttons
          document.getElementById('cancelImportBtn')?.addEventListener('click', closePreviewModal);
          document.getElementById('confirmImportBtn')?.addEventListener('click', confirmImport);
        }

        function createSampleData() {
          tableData.headers = ['ID', 'Name', 'Age', 'City', 'Score', 'Grade', 'Status'];
          tableData.rows = [
            ['001', 'John Doe', '25', 'New York', '85.5', 'B', 'Active'],
            ['002', 'Jane Smith', '30', 'Los Angeles', '92.3', 'A', 'Active'],
            ['003', 'Bob Johnson', '35', 'Chicago', '78.1', 'C', 'Inactive'],
            ['004', 'Alice Brown', '28', 'Houston', '88.7', 'B+', 'Active'],
            ['005', 'Charlie Wilson', '32', 'Phoenix', '95.2', 'A+', 'Active'],
            ['006', 'Diana Lee', '', 'Boston', '91.0', 'A', 'Active'],
            ['007', 'Eric Davis', '29', 'Seattle', '', '', 'Inactive'],
            ['008', 'Fiona Clark', '31', 'Miami', '84.5', 'B', 'Active'],
            ['009', '김철수', '27', '서울', '89.3', 'B+', 'Active'],
            ['010', '이영희', '33', '부산', '93.8', 'A', 'Active']
          ];
          renderTable();
          updateFileStatus('loaded');
          markModified();
          
          const importInfo = document.getElementById('importInfo');
          if (importInfo) {
              importInfo.innerHTML = 
              '<div class="info-box">✓ Sample data loaded successfully</div>';
          }
        }

        function handleFileUpload(e) {
          const file = e.target.files[0];
          if (!file) return;
          
          currentFileName = file.name;
          const maxSize = 50 * 1024 * 1024; // 50MB limit
          
          const importInfo = document.getElementById('importInfo');

          if (file.size > maxSize) {
            if(importInfo) importInfo.innerHTML = 
              '<div class="error-box">⚠️ File too large. Maximum size is 50MB.</div>';
            return;
          }
          
          const reader = new FileReader();
          const encodingSelect = document.getElementById('encodingSelect')
          const encoding = encodingSelect ? encodingSelect.value : 'auto';
          
          reader.onload = function(e) {
            const content = e.target.result;
            
            // Detect encoding if auto
            let detectedEncoding = encoding;
            if (encoding === 'auto' && typeof jschardet !== 'undefined') {
              const detection = jschardet.detect(content);
              if (detection && detection.encoding) {
                detectedEncoding = detection.encoding;
                console.log('Detected encoding:', detectedEncoding);
              }
            }
            
            // Parse CSV with Papa Parse
            parseCSVWithPapa(content);
          };
          
          // Read with specified or detected encoding
          if (encoding === 'auto' || encoding === 'UTF-8') {
            reader.readAsText(file);
          } else {
            reader.readAsText(file, encoding);
          }
        }

        function parseCSVWithPapa(content) {
          const delimiterSelect = document.getElementById('delimiterSelect');
          const delimiter = delimiterSelect ? delimiterSelect.value : 'auto';
          
          const config = {
            delimiter: delimiter === 'auto' ? '' : delimiter,
            newline: '',
            quoteChar: '"',
            escapeChar: '"',
            header: false,
            dynamicTyping: false, // Keep as strings for now
            preview: 10, // Preview first 10 rows
            skipEmptyLines: 'greedy',
            delimitersToGuess: [',', '\\t', '|', ';', ' '],
            complete: function(results) {
              showPreviewModal(results);
            },
            error: function(error) {
              const importInfo = document.getElementById('importInfo');
              if(importInfo) importInfo.innerHTML = 
                \`<div class="error-box">⚠️ Parse error: \${error.message}</div>\`;
            }
          };
          
          // First parse for preview
          Papa.parse(content, config);
          
          // Store full content for actual import
          pendingFileData = content;
        }

        function showPreviewModal(results) {
          const modal = document.getElementById('csvPreviewModal');
          const parseInfo = document.getElementById('parseInfo');
          const previewContent = document.getElementById('previewContent');
          
          if(!modal || !parseInfo || !previewContent) return;

          // Show parse information
          let infoHTML = '<div class="info-box">';
          infoHTML += \`<strong>File:</strong> \${currentFileName}<br>\`;
          infoHTML += \`<strong>Detected Delimiter:</strong> \${results.meta.delimiter || 'comma'}<br>\`;
          infoHTML += \`<strong>Preview Rows:</strong> \${results.data.length}<br>\`;
          if (results.errors.length > 0) {
            infoHTML += \`<strong>⚠️ Errors:</strong> \${results.errors.length} issues found<br>\`;
          }
          infoHTML += '</div>';
          
          parseInfo.innerHTML = infoHTML;
          
          // Show preview table
          let tableHTML = '<table class="preview-table"><thead><tr>';
          
          // Use first row as headers
          if (results.data.length > 0) {
            const headers = results.data[0];
            headers.forEach(h => {
              tableHTML += \`<th>\${h || '(empty)'}</th>\`;
            });
            tableHTML += '</tr></thead><tbody>';
            
            // Show next few rows
            for (let i = 1; i < Math.min(6, results.data.length); i++) {
              tableHTML += '<tr>';
              results.data[i].forEach(cell => {
                tableHTML += \`<td>\${cell || ''}</td>\`;
              });
              tableHTML += '</tr>';
            }
            
            tableHTML += '</tbody></table>';
          }
          
          previewContent.innerHTML = tableHTML;
          
          // Show errors if any
          if (results.errors.length > 0) {
            let errorHTML = '<div class="warning-box"><strong>Issues found:</strong><br>';
            results.errors.slice(0, 3).forEach(err => {
              errorHTML += \`Row \${err.row || '?'}: \${err.message}<br>\`;
            });
            if (results.errors.length > 3) {
              errorHTML += \`... and \${results.errors.length - 3} more\`;
            }
            errorHTML += '</div>';
            previewContent.innerHTML += errorHTML;
          }
          
          modal.classList.add('active');
        }

        function closePreviewModal() {
          const modal = document.getElementById('csvPreviewModal');
          if (modal) modal.classList.remove('active');
          pendingFileData = null;
        }

        function confirmImport() {
          if (!pendingFileData) return;
          
          const delimiterSelect = document.getElementById('delimiterSelect');
          const delimiter = delimiterSelect ? delimiterSelect.value : 'auto';
          const progressBar = document.getElementById('progressBar');
          const progressFill = document.getElementById('progressFill');
          const importInfo = document.getElementById('importInfo');
          
          if(progressBar) progressBar.style.display = 'block';
          
          // Full parse
          Papa.parse(pendingFileData, {
            delimiter: delimiter === 'auto' ? '' : delimiter,
            newline: '',
            quoteChar: '"',
            escapeChar: '"',
            header: false,
            dynamicTyping: false,
            skipEmptyLines: 'greedy',
            delimitersToGuess: [',', '\\t', '|', ';', ' '],
            chunk: function(results, parser) {
              // Update progress
              const progress = Math.round((parser.streamer._input.length - parser.streamer._remaining.length) / parser.streamer._input.length * 100);
              if(progressFill) {
                progressFill.style.width = progress + '%';
                progressFill.textContent = progress + '%';
              }
            },
            complete: function(results) {
              if(progressBar) progressBar.style.display = 'none';
              
              if (results.data.length > 0) {
                // First row as headers
                tableData.headers = results.data[0].map((h,i) => h || \`Column\${i + 1}\`);
                
                // Rest as data rows
                tableData.rows = results.data.slice(1).filter(row => 
                  row.some(cell => cell !== undefined && cell !== '')
                );
                
                // Ensure all rows have same number of columns
                const colCount = tableData.headers.length;
                tableData.rows = tableData.rows.map(row => {
                  while (row.length < colCount) {
                    row.push('');
                  }
                  return row.slice(0, colCount);
                });
                
                renderTable();
                updateFileStatus('loaded');
                closePreviewModal();
                
                if (importInfo) importInfo.innerHTML = 
                  \`<div class="info-box">✓ Imported \${tableData.rows.length} rows successfully</div>\`;
                  
                // Show warnings if there were errors
                if (results.errors.length > 0) {
                  if (importInfo) importInfo.innerHTML += 
                    \`<div class="warning-box">⚠️ \${results.errors.length} rows had issues but were imported</div>\`;
                }
              }
            },
            error: function(error) {
              if(progressBar) progressBar.style.display = 'none';
              if (importInfo) importInfo.innerHTML = 
                \`<div class="error-box">⚠️ Import failed: \${error.message}</div>\`;
              closePreviewModal();
            }
          });
        }

        function renderTable() {
          const table = document.getElementById('dataTable');
          if (!table) return;

          table.innerHTML = '';
          
          if (tableData.headers.length === 0) {
            table.innerHTML = '<tr><td style="padding:40px;text-align:center;color:var(--muted)">No data loaded. Use the controls on the right to get started.</td></tr>';
            updateStats();
            return;
          }
          
          const thead = document.createElement('thead');
          
          // Header row with checkboxes
          const tr = document.createElement('tr');
          const cornerCell = document.createElement('th');
          cornerCell.innerHTML = '☑';
          cornerCell.style.cursor = 'pointer';
          cornerCell.addEventListener('click', toggleAllSelection);
          tr.appendChild(cornerCell);
          
          tableData.headers.forEach((header, i) => {
            const th = document.createElement('th');
            
            // Checkbox for column selection
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = selectedCols.has(i);
            checkbox.style.marginRight = '6px';
            checkbox.addEventListener('change', function() {
              if (this.checked) {
                selectedCols.add(i);
              } else {
                selectedCols.delete(i);
              }
              updateSelection();
            });
            
            // Editable header text
            const headerSpan = document.createElement('span');
            headerSpan.contentEditable = "true";
            headerSpan.textContent = header;
            headerSpan.addEventListener('input', function() {
              tableData.headers[i] = this.textContent || '';
              markModified();
            });
            
            th.appendChild(checkbox);
            th.appendChild(headerSpan);
            
            if (selectedCols.has(i)) {
              th.classList.add('selected-col');
            }
            
            tr.appendChild(th);
          });
          thead.appendChild(tr);
          table.appendChild(thead);
          
          // Body
          const tbody = document.createElement('tbody');
          tableData.rows.forEach((row, rowIdx) => {
            const tr = document.createElement('tr');
            
            // Row checkbox
            const tdCheck = document.createElement('td');
            const rowCheckbox = document.createElement('input');
            rowCheckbox.type = 'checkbox';
            rowCheckbox.checked = selectedRows.has(rowIdx);
            rowCheckbox.addEventListener('change', function() {
              if (this.checked) {
                selectedRows.add(rowIdx);
              } else {
                selectedRows.delete(rowIdx);
              }
              updateSelection();
            });
            tdCheck.appendChild(rowCheckbox);
            tr.appendChild(tdCheck);
            
            // Data cells
            tableData.headers.forEach((_, colIdx) => {
              const td = document.createElement('td');
              td.contentEditable = "true";
              const cellValue = row[colIdx] || '';
              td.textContent = cellValue;
              
              td.addEventListener('input', function() {
                while (row.length <= colIdx) {
                  row.push('');
                }
                row[colIdx] = this.textContent || '';
                markModified();
              });
              
              // Add keyboard navigation
              td.addEventListener('keydown', function(e) {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  navigateCell(rowIdx, colIdx, 'down');
                } else if (e.key === 'Tab') {
                  e.preventDefault();
                  navigateCell(rowIdx, colIdx, e.shiftKey ? 'left' : 'right');
                }
              });
              
              if (selectedCols.has(colIdx)) {
                td.classList.add('selected-col');
              }
              
              if (!cellValue || String(cellValue).trim() === '') {
                td.classList.add('missing-cell');
              }
              
              tr.appendChild(td);
            });
            
            if (selectedRows.has(rowIdx)) {
              tr.classList.add('selected-row');
            }
            
            tbody.appendChild(tr);
          });
          
          table.appendChild(tbody);
          updateStats();
          updateButtonStates();
        }

        function navigateCell(row, col, direction) {
          let newRow = row;
          let newCol = col;
          
          switch (direction) {
            case 'up':
              newRow = Math.max(0, row - 1);
              break;
            case 'down':
              newRow = Math.min(tableData.rows.length - 1, row + 1);
              break;
            case 'left':
              newCol = Math.max(0, col - 1);
              break;
            case 'right':
              newCol = Math.min(tableData.headers.length - 1, col + 1);
              break;
          }
          
          const tbody = document.querySelector('#dataTable tbody');
          if (tbody) {
            const targetCell = tbody.rows[newRow]?.cells[newCol + 1]; // +1 for checkbox column
            if (targetCell) {
              targetCell.focus();
            }
          }
        }

        function toggleAllSelection() {
          if (selectedRows.size === tableData.rows.length && selectedCols.size === tableData.headers.length) {
            selectedRows.clear();
            selectedCols.clear();
          } else {
            tableData.rows.forEach((_, i) => selectedRows.add(i));
            tableData.headers.forEach((_, i) => selectedCols.add(i));
          }
          updateSelection();
        }

        function updateSelection() {
          // Update column selection
          document.querySelectorAll('#dataTable th').forEach((th, i) => {
            if (i > 0 && selectedCols.has(i - 1)) {
              th.classList.add('selected-col');
            } else {
              th.classList.remove('selected-col');
            }
          });
          
          document.querySelectorAll('#dataTable tbody tr').forEach((tr, rowIdx) => {
            // Update row selection
            if (selectedRows.has(rowIdx)) {
              tr.classList.add('selected-row');
            } else {
              tr.classList.remove('selected-row');
            }
            
            // Update cell selection
            tr.querySelectorAll('td').forEach((td, i) => {
              if (i > 0 && selectedCols.has(i - 1)) {
                td.classList.add('selected-col');
              } else {
                td.classList.remove('selected-col');
              }
            });
          });
          
          updateStats();
          updateButtonStates();
        }

        function updateStats() {
          document.getElementById('rowCount').textContent = tableData.rows.length;
          document.getElementById('colCount').textContent = tableData.headers.length;
          document.getElementById('selectedCount').textContent = \`\${selectedRows.size} rows, \${selectedCols.size} cols\`;
          
          // Count missing values
          let missingCount = 0;
          tableData.rows.forEach(row => {
            tableData.headers.forEach((_, colIdx) => {
              const value = row[colIdx];
              if (!value || String(value).trim() === '') {
                missingCount++;
              }
            });
          });
          document.getElementById('missingCount').textContent = missingCount;
        }

        function updateButtonStates() {
          const hasData = tableData.headers.length > 0;
          document.getElementById('addRowAboveBtn').disabled = !hasData || selectedRows.size === 0;
          document.getElementById('addRowBelowBtn').disabled = !hasData || selectedRows.size === 0;
          document.getElementById('deleteRowBtn').disabled = selectedRows.size === 0;
          document.getElementById('addColLeftBtn').disabled = !hasData || selectedCols.size === 0;
          document.getElementById('addColRightBtn').disabled = !hasData || selectedCols.size === 0;
          document.getElementById('deleteColBtn').disabled = selectedCols.size === 0;
          document.getElementById('fillMissingBtn').disabled = selectedCols.size === 0;
          document.getElementById('transformBtn').disabled = selectedCols.size === 0 || !document.getElementById('transformSelect').value;
          document.getElementById('undoTransformBtn').disabled = transformHistory.length === 0;
        }

        function markModified() {
          isModified = true;
          updateFileStatus('modified');
        }

        function updateFileStatus(status = 'none') {
          const statusEl = document.getElementById('fileStatus');
          if (!statusEl) return;
          let statusText = '';
          let statusClass = '';
          
          switch (status) {
            case 'loaded':
              statusText = currentFileName ? \`Loaded: \${currentFileName}\` : 'Data Loaded';
              statusClass = 'status-saved';
              isModified = false;
              break;
            case 'modified':
              statusText = 'Modified';
              statusClass = 'status-modified';
              break;
            case 'error':
              statusText = 'Error';
              statusClass = 'status-error';
              break;
          }
          
          statusEl.innerHTML = statusText ? \`<span class="status-indicator \${statusClass}">\${statusText}</span>\` : '';
        }

        // Row operations
        function addRowAbove() {
          if (selectedRows.size === 0) return;
          
          const indices = Array.from(selectedRows).sort((a, b) => a - b);
          indices.forEach((idx, i) => {
            const newRow = new Array(tableData.headers.length).fill('');
            tableData.rows.splice(idx + i, 0, newRow);
          });
          
          selectedRows.clear();
          renderTable();
          markModified();
        }

        function addRowBelow() {
          if (selectedRows.size === 0) return;
          
          const indices = Array.from(selectedRows).sort((a, b) => b - a);
          indices.forEach(idx => {
            const newRow = new Array(tableData.headers.length).fill('');
            tableData.rows.splice(idx + 1, 0, newRow);
          });
          
          selectedRows.clear();
          renderTable();
          markModified();
        }

        function deleteSelectedRows() {
          if (selectedRows.size === 0) return;
          
          if (!confirm(\`Delete \${selectedRows.size} selected row(s)?\`)) return;
          
          const indices = Array.from(selectedRows).sort((a, b) => b - a);
          indices.forEach(idx => {
            tableData.rows.splice(idx, 1);
          });
          
          selectedRows.clear();
          renderTable();
          markModified();
        }

        // Column operations
        function addColLeft() {
          if (selectedCols.size === 0) return;
          
          const name = prompt('Enter column name:');
          if (!name) return;
          
          const minIdx = Math.min(...Array.from(selectedCols));
          
          tableData.headers.splice(minIdx, 0, name);
          tableData.rows.forEach(row => {
            row.splice(minIdx, 0, '');
          });
          
          renderTable();
          markModified();
        }

        function addColRight() {
          if (selectedCols.size === 0) return;
          
          const name = prompt('Enter column name:');
          if (!name) return;
          
          const maxIdx = Math.max(...Array.from(selectedCols));
          
          tableData.headers.splice(maxIdx + 1, 0, name);
          tableData.rows.forEach(row => {
            row.splice(maxIdx + 1, 0, '');
          });
          
          renderTable();
          markModified();
        }

        function deleteSelectedCols() {
          if (selectedCols.size === 0) return;
          
          if (!confirm(\`Delete \${selectedCols.size} selected column(s)?\`)) return;
          
          const indices = Array.from(selectedCols).sort((a, b) => b - a);
          indices.forEach(idx => {
            tableData.headers.splice(idx, 1);
            tableData.rows.forEach(row => {
              row.splice(idx, 1);
            });
          });
          
          selectedCols.clear();
          renderTable();
          markModified();
        }

        function checkMissingValues() {
          const missingInfo = document.getElementById('missingInfo');
          let missingCount = 0;
          const missingByCols = {};
          
          tableData.headers.forEach((header, colIdx) => {
            missingByCols[header] = 0;
            tableData.rows.forEach(row => {
              const value = row[colIdx] || '';
              if (String(value).trim() === '') {
                missingCount++;
                missingByCols[header]++;
              }
            });
          });
          
          if (missingCount === 0) {
            if(missingInfo) missingInfo.innerHTML = '<div class="info-box">✓ No missing values found</div>';
          } else {
            let html = '<div class="warning-box">';
            html += \`<strong>\${missingCount} missing values found</strong><br>\`;
            html += '<div style="max-height:150px;overflow-y:auto;margin-top:8px;">';
            Object.entries(missingByCols).forEach(([col, count]) => {
              if (count > 0) {
                const percent = ((count / tableData.rows.length) * 100).toFixed(1);
                html += \`\${col}: \${count} (\${percent}%)<br>\`;
              }
            });
            html += '</div></div>';
            if(missingInfo) missingInfo.innerHTML = html;
          }
          
          updateStats();
        }

        function fillMissingValues() {
          if (selectedCols.size === 0) return;
          
          const fillMethod = document.getElementById('fillMethod');
          if (!fillMethod) return;
          const method = fillMethod.value;

          let customValue = '';
          
          if (method === 'custom') {
            customValue = prompt('Enter value to fill:');
            if (customValue === null) return;
          }
          
          // Save for undo
          transformHistory.push({
            headers: [...tableData.headers],
            rows: tableData.rows.map(row => [...row])
          });
          
          selectedCols.forEach(colIdx => {
            const values = tableData.rows.map(row => row[colIdx]).filter(v => v && String(v).trim() !== '');
            
            // Check if column is numeric
            const numericValues = values.map(v => parseFloat(v)).filter(n => !isNaN(n));
            const isNumericColumn = numericValues.length > values.length * 0.5; // More than 50% numeric
            
            let fillValue = '';
            
            switch (method) {
              case 'mean':
                if (isNumericColumn && numericValues.length > 0) {
                  fillValue = (numericValues.reduce((a, b) => a + b, 0) / numericValues.length).toFixed(2);
                } else {
                  // For non-numeric columns, use mode
                  const freq = {};
                  values.forEach(v => freq[v] = (freq[v] || 0) + 1);
                  fillValue = values.length > 0 ? Object.keys(freq).reduce((a, b) => freq[a] > freq[b] ? a : b, '') : '';
                }
                break;
                
              case 'median':
                if (isNumericColumn && numericValues.length > 0) {
                  const sorted = numericValues.sort((a, b) => a - b);
                  const mid = Math.floor(sorted.length / 2);
                  fillValue = sorted.length % 2 === 0 ? 
                    ((sorted[mid - 1] + sorted[mid]) / 2).toFixed(2) : 
                    sorted[mid].toFixed(2);
                } else {
                  // For non-numeric columns, use mode
                  const freq = {};
                  values.forEach(v => freq[v] = (freq[v] || 0) + 1);
                  fillValue = values.length > 0 ? Object.keys(freq).reduce((a, b) => freq[a] > freq[b] ? a : b, '') : '';
                }
                break;
                
              case 'mode':
                if (values.length > 0) {
                  const freq = {};
                  values.forEach(v => freq[v] = (freq[v] || 0) + 1);
                  fillValue = Object.keys(freq).reduce((a, b) => freq[a] > freq[b] ? a : b, '');
                }
                break;
                
              case 'zero':
                fillValue = isNumericColumn ? '0' : '';
                break;
                
              case 'forward':
                let lastVal = '';
                tableData.rows.forEach(row => {
                  if (!row[colIdx] || String(row[colIdx]).trim() === '') {
                    row[colIdx] = lastVal;
                  } else {
                    lastVal = row[colIdx];
                  }
                });
                break;
                
              case 'backward':
                let nextVal = '';
                for (let i = tableData.rows.length - 1; i >= 0; i--) {
                  if (!tableData.rows[i][colIdx] || String(tableData.rows[i][colIdx]).trim() === '') {
                    tableData.rows[i][colIdx] = nextVal;
                  } else {
                    nextVal = tableData.rows[i][colIdx];
                  }
                }
                break;
                
              case 'interpolate':
                if (isNumericColumn) {
                  // Linear interpolation for numeric data
                  for (let i = 0; i < tableData.rows.length; i++) {
                    const currentVal = tableData.rows[i][colIdx];
                    if (!currentVal || String(currentVal).trim() === '') {
                      // Find previous and next non-empty numeric values
                      let prevIdx = i - 1;
                      let nextIdx = i + 1;
                      let prevVal = null;
                      let nextVal = null;
                      
                      while (prevIdx >= 0) {
                        const val = parseFloat(tableData.rows[prevIdx][colIdx]);
                        if (!isNaN(val)) {
                          prevVal = val;
                          break;
                        }
                        prevIdx--;
                      }
                      
                      while (nextIdx < tableData.rows.length) {
                        const val = parseFloat(tableData.rows[nextIdx][colIdx]);
                        if (!isNaN(val)) {
                          nextVal = val;
                          break;
                        }
                        nextIdx++;
                      }
                      
                      if (prevVal !== null && nextVal !== null) {
                        // Interpolate
                        const steps = nextIdx - prevIdx;
                        const step = (nextVal - prevVal) / steps;
                        tableData.rows[i][colIdx] = (prevVal + step * (i - prevIdx)).toFixed(2);
                      } else if (prevVal !== null) {
                        tableData.rows[i][colIdx] = prevVal.toFixed(2);
                      } else if (nextVal !== null) {
                        tableData.rows[i][colIdx] = nextVal.toFixed(2);
                      }
                    }
                  }
                } else {
                  // For non-numeric, use forward fill
                  let lastVal = '';
                  tableData.rows.forEach(row => {
                    if (!row[colIdx] || String(row[colIdx]).trim() === '') {
                      row[colIdx] = lastVal;
                    } else {
                      lastVal = row[colIdx];
                    }
                  });
                }
                break;
                
              case 'custom':
                fillValue = customValue;
                break;
            }
            
            // Apply fill value for methods that set fillValue
            if (fillValue !== '' && method !== 'forward' && method !== 'backward' && method !== 'interpolate') {
              tableData.rows.forEach(row => {
                if (!row[colIdx] || String(row[colIdx]).trim() === '') {
                  row[colIdx] = fillValue;
                }
              });
            }
          });
          
          renderTable();
          markModified();
          checkMissingValues();
        }

        function applyTransformation() {
          const transformSelect = document.getElementById('transformSelect');
          if (!transformSelect) return;
          const transformType = transformSelect.value;
          
          if (!transformType || selectedCols.size === 0) return;
          
          // Save for undo
          transformHistory.push({
            headers: [...tableData.headers],
            rows: tableData.rows.map(row => [...row])
          });
          
          selectedCols.forEach(colIdx => {
            const values = tableData.rows.map(row => parseFloat(row[colIdx])).filter(v => !isNaN(v));
            
            if (values.length === 0) return;
            
            let transformed = [];
            
            switch (transformType) {
              case 'log': transformed = values.map(v => v > 0 ? Math.log(v) : NaN); break;
              case 'log10': transformed = values.map(v => v > 0 ? Math.log10(v) : NaN); break;
              case 'sqrt': transformed = values.map(v => v >= 0 ? Math.sqrt(v) : NaN); break;
              case 'square': transformed = values.map(v => v * v); break;
              case 'reciprocal': transformed = values.map(v => v !== 0 ? 1 / v : NaN); break;
              case 'zscore':
                const mean = values.reduce((a, b) => a + b, 0) / values.length;
                const std = Math.sqrt(values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / (values.length - 1));
                transformed = values.map(v => std !== 0 ? (v - mean) / std : 0);
                break;
              case 'minmax':
                const min = Math.min(...values);
                const max = Math.max(...values);
                const range = max - min;
                transformed = values.map(v => range !== 0 ? (v - min) / range : 0);
                break;
              case 'rank':
                const sorted = [...values].sort((a, b) => a - b);
                const ranks = {};
                sorted.forEach((v, i) => { if (!(v in ranks)) ranks[v] = i + 1; });
                transformed = values.map(v => ranks[v]);
                break;
              case 'abs': transformed = values.map(v => Math.abs(v)); break;
              case 'round': transformed = values.map(v => Math.round(v)); break;
              case 'ceil': transformed = values.map(v => Math.ceil(v)); break;
              case 'floor': transformed = values.map(v => Math.floor(v)); break;
            }
            
            let idx = 0;
            tableData.rows.forEach(row => {
              const val = parseFloat(row[colIdx]);
              if (!isNaN(val)) {
                const newVal = transformed[idx++];
                row[colIdx] = isNaN(newVal) ? '' : 
                             (transformType === 'round' || transformType === 'ceil' || transformType === 'floor' || transformType === 'rank') ? 
                             String(newVal) : newVal.toFixed(4);
              }
            });
          });
          
          renderTable();
          markModified();
        }

        function undoLastTransform() {
          if (transformHistory.length === 0) return;
          
          const lastState = transformHistory.pop();
          tableData.headers = lastState.headers;
          tableData.rows = lastState.rows;
          
          renderTable();
          markModified();
        }

        function downloadCSV() {
          const csv = tableToCSV();
          const blob = new Blob(['\\ufeff' + csv], { type: 'text/csv;charset=utf-8;' }); // Add BOM for Excel
          const link = document.createElement('a');
          link.href = URL.createObjectURL(blob);
          link.download = currentFileName || 'data_edited.csv';
          link.click();
          updateFileStatus('loaded');
        }

        function clearAll() {
          if (tableData.headers.length === 0) return;
          
          if (confirm('Clear all data? This cannot be undone.')) {
            tableData.headers = [];
            tableData.rows = [];
            selectedCols.clear();
            selectedRows.clear();
            transformHistory = [];
            renderTable();
            updateFileStatus();
            const importInfo = document.getElementById('importInfo');
            if(importInfo) importInfo.innerHTML = '';
          }
        }

        function applyFilter() {
          const searchInput = document.getElementById('searchInput');
          if (!searchInput) return;
          const searchTerm = searchInput.value.toLowerCase();
          const tbody = document.querySelector('#dataTable tbody');
          
          if (!tbody) return;
          
          Array.from(tbody.rows).forEach(row => {
            const text = Array.from(row.cells).slice(1).map(td => td.textContent?.toLowerCase() || '').join(' ');
            row.style.display = text.includes(searchTerm) ? '' : 'none';
          });
        }
        
        init();

      })();
    `;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  return (
    <div dangerouslySetInnerHTML={{ __html: `
    <!DOCTYPE html>
    <html lang="en">
    <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>📊 Data Editor (Improved)</title>

    <!-- Papa Parse for robust CSV parsing -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/PapaParse/5.4.1/papaparse.min.js"></script>
    <!-- jschardet for encoding detection -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jschardet/3.0.0/jschardet.min.js"></script>

    <style>
      :root{
        --bg:#f4f5f7; --card:#ffffff; --muted:#6b7280; --accent:#2563eb; --success:#059669;
        --fail:#9ca3af; --shadow:0 8px 30px rgba(16,24,40,0.06); --warning:#f59e0b;
        --info:#0ea5e9; --danger:#dc2626;
      }
      
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      
      body {
        font-family:"Inter","Segoe UI",Roboto,Arial,sans-serif;
        background:var(--bg);
        color:#111827;
        height:100vh;
        overflow:hidden;
      }
      
      .app-container {
        height:100vh;
        display:flex;
        flex-direction:column;
      }
      
      .header-bar {
        background:var(--card);
        box-shadow:var(--shadow);
        padding:16px 24px;
        display:flex;
        align-items:center;
        justify-content:space-between;
        border-bottom:1px solid #e5e7eb;
      }
      
      .header-bar h1 {
        font-size:20px;
        color:black;
        display:flex;
        align-items:center;
        gap:8px;
      }
      
      .header-controls {
        display:flex;
        gap:12px;
        align-items:center;
      }
      
      .main-content {
        flex:1;
        display:flex;
        overflow:hidden;
      }
      
      .table-section {
        flex:1;
        display:flex;
        flex-direction:column;
        overflow:hidden;
        background:var(--card);
        margin:16px 0 16px 16px;
        border-radius:12px;
        box-shadow:var(--shadow);
      }
      
      .table-header {
        padding:16px;
        border-bottom:1px solid #e5e7eb;
      }
      
      .table-container {
        flex:1;
        overflow:auto;
        position:relative;
        padding:0 16px 16px 16px;
      }
      
      /* Table Styles */
      table {
        width:100%;
        border-collapse:collapse;
        background:white;
      }
      
      th, td {
        border:1px solid #e5e7eb;
        padding:8px 12px;
        text-align:left;
        min-width:100px;
        position:relative;
        font-size:13px;
        white-space:nowrap;
        overflow:hidden;
        text-overflow:ellipsis;
      }
      
      th:first-child, td:first-child {
        min-width:40px;
        width:40px;
        position:sticky;
        left:0;
        background:#f8fafc;
        z-index:10;
        text-align:center;
      }
      
      thead th {
        background:#f8fafc;
        font-weight:600;
        position:sticky;
        top:0;
        z-index:20;
      }
      
      thead th:first-child {
        z-index:30;
      }
      
      td[contenteditable]:hover {
        background:#f9fafb;
        z-index:5;
      }
      
      td[contenteditable]:focus, th[contenteditable]:focus {
        background:#f0f9ff;
        outline:2px solid var(--info);
        border-radius:4px;
        z-index:100;
      }
      
      /* Sidebar */
      .sidebar {
        width:320px;
        background:var(--card);
        margin:16px 16px 16px 8px;
        border-radius:12px;
        box-shadow:var(--shadow);
        display:flex;
        flex-direction:column;
        overflow-y:auto;
      }
      
      .sidebar-section {
        padding:16px;
        border-bottom:1px solid #e5e7eb;
      }
      
      .sidebar-section:last-child {
        border-bottom:none;
      }
      
      .section-title {
        font-size:14px;
        font-weight:600;
        color:#374151;
        margin-bottom:12px;
        display:flex;
        align-items:center;
        gap:6px;
      }
      
      /* Controls */
      .btn {
        border:0;
        padding:8px 12px;
        border-radius:8px;
        cursor:pointer;
        font-weight:500;
        font-size:12px;
        transition:all 0.2s;
      }
      
      .btn:hover {
        transform:translateY(-1px);
        box-shadow:0 2px 8px rgba(0,0,0,0.15);
      }
      
      .btn:disabled {
        background:var(--fail);
        cursor:not-allowed;
        transform:none;
        box-shadow:none;
      }
      
      .btn.primary{background:var(--accent);color:#fff}
      .btn.success{background:var(--success);color:#fff}
      .btn.warning{background:var(--warning);color:#fff}
      .btn.danger{background:var(--danger);color:#fff}
      .btn.ghost{background:#f3f4f6;color:#111827}
      
      .btn-group {
        display:flex;
        gap:6px;
        margin-bottom:8px;
      }
      
      .btn-group .btn {
        flex:1;
        font-size:11px;
        padding:6px 8px;
      }
      
      /* Form Controls */
      .control-row {
        display:flex;
        gap:8px;
        align-items:center;
        margin-bottom:12px;
      }
      
      .control-row label {
        font-size:12px;
        color:var(--muted);
        min-width:80px;
      }
      
      .control-row select,
      .control-row input[type="text"],
      .control-row input[type="number"] {
        flex:1;
        padding:6px 8px;
        border:1px solid #e5e7eb;
        border-radius:6px;
        font-size:12px;
      }
      
      .file-input {
        padding:6px;
        border:1px solid #e5e7eb;
        border-radius:6px;
        background:white;
        font-size:12px;
        width:100%;
      }
      
      .search-input {
        flex:1;
        padding:6px 10px;
        border:1px solid #e5e7eb;
        border-radius:6px;
        font-size:13px;
      }
      
      /* Selection States */
      .selected-col {
        background:#e0f2fe !important;
      }
      
      .selected-row {
        background:#fef3c7 !important;
      }
      
      .selected-row td {
        background:#fef3c7 !important;
      }
      
      /* Missing value indicators */
      .missing-cell {
        background:#fecaca !important;
        color:var(--danger);
      }
      
      .has-missing {
        background:#fef2f2 !important;
        border:2px solid var(--danger) !important;
      }
      
      /* Status */
      .status-bar {
        padding:8px 16px;
        background:#f9fafb;
        border-top:1px solid #e5e7eb;
        font-size:12px;
        color:var(--muted);
        display:flex;
        gap:16px;
      }
      
      .status-item {
        display:flex;
        gap:4px;
      }
      
      .status-label {
        font-weight:600;
      }
      
      .status-indicator {
        display:inline-block;
        padding:2px 6px;
        border-radius:4px;
        font-weight:500;
        color:white;
        font-size:10px;
        margin-left:8px;
      }
      
      .status-modified{background:var(--warning);}
      .status-saved{background:var(--success);}
      .status-error{background:var(--danger);}
      
      /* Info Box */
      .info-box {
        background:#f0f9ff;
        border:1px solid var(--info);
        border-radius:6px;
        padding:8px;
        font-size:11px;
        color:#0369a1;
        margin-top:8px;
      }
      
      .warning-box {
        background:#fef3c7;
        border:1px solid var(--warning);
        border-radius:6px;
        padding:8px;
        font-size:11px;
        color:#92400e;
        margin-top:8px;
      }
      
      .error-box {
        background:#fef2f2;
        border:1px solid var(--danger);
        border-radius:6px;
        padding:8px;
        font-size:11px;
        color:#991b1b;
        margin-top:8px;
      }
      
      /* Modal for CSV import options */
      .modal {
        display:none;
        position:fixed;
        z-index:1000;
        left:0;
        top:0;
        width:100%;
        height:100%;
        background:rgba(0,0,0,0.5);
        align-items:center;
        justify-content:center;
      }
      
      .modal.active {
        display:flex;
      }
      
      .modal-content {
        background:white;
        border-radius:12px;
        padding:24px;
        width:500px;
        max-width:90%;
        max-height:80vh;
        overflow-y:auto;
      }
      
      .modal-header {
        font-size:18px;
        font-weight:600;
        margin-bottom:16px;
        color:#111827;
      }
      
      .modal-body {
        margin-bottom:16px;
      }
      
      .modal-footer {
        display:flex;
        gap:8px;
        justify-content:flex-end;
      }
      
      .preview-table {
        width:100%;
        font-size:11px;
        margin-top:12px;
        border:1px solid #e5e7eb;
        border-radius:6px;
        overflow:hidden;
      }
      
      .preview-table th,
      .preview-table td {
        padding:6px;
        border:1px solid #e5e7eb;
        min-width:60px;
      }
      
      .preview-table th {
        background:#f8fafc;
        font-weight:600;
      }
      
      /* Progress bar */
      .progress-bar {
        width:100%;
        height:20px;
        background:#e5e7eb;
        border-radius:10px;
        overflow:hidden;
        margin:12px 0;
      }
      
      .progress-fill {
        height:100%;
        background:var(--accent);
        transition:width 0.3s;
        display:flex;
        align-items:center;
        justify-content:center;
        color:white;
        font-size:11px;
        font-weight:600;
      }
      
      /* Scrollbar Styling */
      .table-container::-webkit-scrollbar,
      .sidebar::-webkit-scrollbar {
        width:10px;
        height:10px;
      }
      
      .table-container::-webkit-scrollbar-track,
      .sidebar::-webkit-scrollbar-track {
        background:#f1f1f1;
        border-radius:5px;
      }
      
      .table-container::-webkit-scrollbar-thumb,
      .sidebar::-webkit-scrollbar-thumb {
        background:#c1c1c1;
        border-radius:5px;
      }
      
      .table-container::-webkit-scrollbar-thumb:hover,
      .sidebar::-webkit-scrollbar-thumb:hover {
        background:#a1a1a1;
      }
      
      /* Responsive */
      @media (max-width: 768px) {
        .main-content {
          flex-direction:column;
        }
        
        .sidebar {
          width:100%;
          margin:8px 16px;
          max-height:300px;
        }
        
        .table-section {
          margin:8px 16px;
        }
      }
    </style>
    </head>
    <body>
      <div class="app-container">
        <!-- Header -->
        <div class="header-bar">
          <h1>📊 Data Editor</h1>
          <div class="header-controls">
            <input id="searchInput" type="text" placeholder="Search data..." class="search-input">
            <div id="fileStatus"></div>
          </div>
        </div>
        
        <!-- Main Content -->
        <div class="main-content">
          <!-- Table Section -->
          <div class="table-section">
            <div class="table-header">
              <div class="status-bar">
                <div class="status-item">
                  <span class="status-label">Rows:</span>
                  <span id="rowCount">0</span>
                </div>
                <div class="status-item">
                  <span class="status-label">Columns:</span>
                  <span id="colCount">0</span>
                </div>
                <div class="status-item">
                  <span class="status-label">Selected:</span>
                  <span id="selectedCount">0 rows, 0 cols</span>
                </div>
                <div class="status-item">
                  <span class="status-label">Missing:</span>
                  <span id="missingCount">0</span>
                </div>
              </div>
            </div>
            <div class="table-container">
              <table id="dataTable">
                <tr><td style="padding:40px;text-align:center;color:var(--muted)">No data loaded. Use the controls on the right to get started.</td></tr>
              </table>
            </div>
          </div>
          
          <!-- Sidebar -->
          <div class="sidebar">
            <!-- File Operations -->
            <div class="sidebar-section">
              <div class="section-title">📁 File Operations</div>
              <input id="fileInput" type="file" accept=".csv,.txt,.tsv" class="file-input" style="margin-bottom:8px">
              
              <!-- CSV Import Options -->
              <div class="control-row">
                <label>Encoding:</label>
                <select id="encodingSelect">
                  <option value="auto">Auto Detect</option>
                  <option value="UTF-8">UTF-8</option>
                  <option value="ISO-8859-1">ISO-8859-1</option>
                  <option value="Windows-1252">Windows-1252</option>
                  <option value="EUC-KR">EUC-KR</option>
                  <option value="CP949">CP949</option>
                </select>
              </div>
              
              <div class="control-row">
                <label>Delimiter:</label>
                <select id="delimiterSelect">
                  <option value="auto">Auto Detect</option>
                  <option value=",">Comma (,)</option>
                  <option value="\\t">Tab</option>
                  <option value=";">Semicolon (;)</option>
                  <option value="|">Pipe (|)</option>
                  <option value=" ">Space</option>
                </select>
              </div>
              
              <div class="btn-group">
                <button id="createSampleBtn" class="btn ghost">Sample Data</button>
                <button id="downloadCSVBtn" class="btn warning">Export CSV</button>
              </div>
              
              <div id="importInfo"></div>
            </div>
            
            <!-- Row Operations -->
            <div class="sidebar-section">
              <div class="section-title">📋 Row Operations</div>
              <div class="btn-group">
                <button id="addRowAboveBtn" class="btn success" disabled>Add Above</button>
                <button id="addRowBelowBtn" class="btn success" disabled>Add Below</button>
              </div>
              <button id="deleteRowBtn" class="btn danger" style="width:100%" disabled>Delete Selected Rows</button>
            </div>
            
            <!-- Column Operations -->
            <div class="sidebar-section">
              <div class="section-title">📊 Column Operations</div>
              <div class="btn-group">
                <button id="addColLeftBtn" class="btn primary" disabled>Add Left</button>
                <button id="addColRightBtn" class="btn primary" disabled>Add Right</button>
              </div>
              <button id="deleteColBtn" class="btn danger" style="width:100%" disabled>Delete Selected Columns</button>
            </div>
            
            <!-- Data Quality -->
            <div class="sidebar-section">
              <div class="section-title">🔍 Data Quality</div>
              <button id="checkMissingBtn" class="btn ghost" style="width:100%;margin-bottom:8px">Check Missing Values</button>
              <div class="control-row">
                <label>Fill Method:</label>
                <select id="fillMethod">
                  <option value="mean">Mean</option>
                  <option value="median">Median</option>
                  <option value="mode">Mode</option>
                  <option value="zero">Zero</option>
                  <option value="forward">Forward</option>
                  <option value="backward">Backward</option>
                  <option value="interpolate">Interpolate</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
              <button id="fillMissingBtn" class="btn warning" style="width:100%" disabled>Fill Missing Values</button>
              <div id="missingInfo"></div>
            </div>
            
            <!-- Transformations -->
            <div class="sidebar-section">
              <div class="section-title">⚡ Transformations</div>
              <div class="control-row">
                <label>Transform:</label>
                <select id="transformSelect">
                  <option value="">Select...</option>
                  <option value="log">Log</option>
                  <option value="log10">Log10</option>
                  <option value="sqrt">√x</option>
                  <option value="square">x²</option>
                  <option value="reciprocal">1/x</option>
                  <option value="zscore">Z-Score</option>
                  <option value="minmax">Min-Max</option>
                  <option value="rank">Rank</option>
                  <option value="abs">|x|</option>
                  <option value="round">Round</option>
                  <option value="ceil">Ceiling</option>
                  <option value="floor">Floor</option>
                </select>
              </div>
              <div class="btn-group">
                <button id="transformBtn" class="btn warning" disabled>Apply</button>
                <button id="undoTransformBtn" class="btn ghost" disabled>Undo</button>
              </div>
              <div class="info-box">
                Select numeric columns first, then choose a transformation to apply.
              </div>
            </div>
            
            <!-- Clear -->
            <div class="sidebar-section">
              <button id="clearAllBtn" class="btn ghost" style="width:100%">Clear All Data</button>
            </div>
          </div>
        </div>
      </div>
      
      <!-- CSV Preview Modal -->
      <div id="csvPreviewModal" class="modal">
        <div class="modal-content">
          <div class="modal-header">📄 CSV Import Preview</div>
          <div class="modal-body">
            <div id="parseInfo"></div>
            <div id="previewContent"></div>
            <div class="progress-bar" id="progressBar" style="display:none;">
              <div class="progress-fill" id="progressFill">0%</div>
            </div>
          </div>
          <div class="modal-footer">
            <button id="cancelImportBtn" class="btn ghost">Cancel</button>
            <button id="confirmImportBtn" class="btn primary">Import</button>
          </div>
        </div>
      </div>
    </body>
    </html>
    ` }} />
  );
};

// You need to ensure that this component is rendered on the client side only.
// If you are using Next.js App Router, this file should be at the top of the component tree.
export default DataEditorPage;
