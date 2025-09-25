import './style.css'
import { FraudDetector } from './fraud-detector.js'
import { UIManager } from './ui-manager.js'
import { ChartManager } from './chart-manager.js'

class App {
    constructor() {
        this.fraudDetector = new FraudDetector()
        this.uiManager = new UIManager()
        this.chartManager = new ChartManager()
        this.init()
    }

    init() {
        this.uiManager.init()
        this.setupEventListeners()
    }

    setupEventListeners() {
        // Wait for UI to be rendered before setting up event listeners
        setTimeout(() => {
            this.setupFileUpload()
            this.setupSampleData()
            this.setupThemeToggle()
        }, 100)
    }

    setupFileUpload() {
        const fileInput = document.getElementById('file-input')
        const dropZone = document.getElementById('drop-zone')
        const chooseFileBtn = document.getElementById('choose-file-btn')

        if (fileInput) {
            fileInput.addEventListener('change', (e) => this.handleFileUpload(e.target.files[0]))
        }
        
        if (chooseFileBtn) {
            chooseFileBtn.addEventListener('click', (e) => {
                e.stopPropagation() // Prevent bubbling to drop zone
                fileInput?.click()
            })
        }
        
        if (dropZone) {
            dropZone.addEventListener('dragover', (e) => {
                e.preventDefault()
                dropZone.classList.add('drag-over')
            })
            
            dropZone.addEventListener('dragleave', () => {
                dropZone.classList.remove('drag-over')
            })
            
            dropZone.addEventListener('drop', (e) => {
                e.preventDefault()
                dropZone.classList.remove('drag-over')
                this.handleFileUpload(e.dataTransfer.files[0])
            })

            dropZone.addEventListener('click', (e) => {
                // Only trigger file input if the click is on the drop zone itself,
                // not on the button inside it
                if (e.target === dropZone || (!e.target.closest('#choose-file-btn'))) {
                    fileInput?.click()
                }
            })
        }
    }

    setupSampleData() {
        const sampleButton = document.getElementById('load-sample')
        if (sampleButton) {
            sampleButton.addEventListener('click', () => {
                this.loadSampleData()
            })
        }
    }

    setupThemeToggle() {
        const themeToggle = document.getElementById('theme-toggle')
        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                this.uiManager.toggleTheme()
            })
        }
    }

    async handleFileUpload(file) {
        if (!file) return

        if (!file.name.endsWith('.csv')) {
            this.uiManager.showError('Please upload a CSV file')
            return
        }

        this.uiManager.showLoading(true)
        
        try {
            const text = await file.text()
            const data = this.parseCSV(text)
            await this.processData(data)
        } catch (error) {
            console.error('Error processing file:', error)
            this.uiManager.showError('Error processing file: ' + error.message)
        } finally {
            this.uiManager.showLoading(false)
        }
    }

    parseCSV(text) {
        const lines = text.trim().split('\n')
        const headers = lines[0].split(',').map(h => h.trim())
        const data = []

        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',')
            const row = {}
            headers.forEach((header, index) => {
                row[header] = parseFloat(values[index]) || 0
            })
            data.push(row)
        }

        return { headers, data }
    }

    async processData(csvData) {
        try {
            const predictions = await this.fraudDetector.predict(csvData.data)
            this.displayResults(csvData, predictions)
        } catch (error) {
            console.error('Error processing data:', error)
            this.uiManager.showError('Error processing data: ' + error.message)
        }
    }

    displayResults(csvData, predictions) {
        const resultsContainer = document.getElementById('results-container')
        if (resultsContainer) {
            resultsContainer.classList.remove('hidden')
        }

        // Update statistics
        const totalTransactions = predictions.length
        const fraudulentCount = predictions.filter(p => p.prediction === 1).length
        const legitimateCount = totalTransactions - fraudulentCount
        const fraudRate = totalTransactions > 0 ? ((fraudulentCount / totalTransactions) * 100).toFixed(1) : '0'
        // --- NEW: Calculate Potential Fraud Loss Prevented ---
        const fraudLossPrevented = predictions.reduce((sum, p, idx) => {
            if (p.prediction === 1) {
                const amt = csvData.data[idx].Amount || 0
                return sum + amt
            }
            return sum
        }, 0)

        this.updateElement('total-transactions', totalTransactions)
        this.updateElement('fraudulent-count', fraudulentCount)
        this.updateElement('legitimate-count', legitimateCount)
        this.updateElement('fraud-rate', fraudRate + '%')
        this.updateElement('fraud-loss-prevented', `$${fraudLossPrevented.toFixed(2)}`)

        // Create charts
        this.chartManager.createPieChart(fraudulentCount, legitimateCount)
        this.chartManager.createConfidenceChart(predictions)

        // Display transaction table
        this.displayTransactionTable(csvData, predictions)

        // --- NEW: Render Top 5 High-Risk Transactions ---
        this.renderTop5(csvData, predictions)

        // --- NEW: Setup Download CSV Button ---
        this.setupDownloadButton(csvData, predictions)

        // --- NEW: Compute and render Fraud Rate Trend ---
        this.renderFraudRateTrend(csvData, predictions)
    }

    updateElement(id, value) {
        const element = document.getElementById(id)
        if (element) {
            element.textContent = value
        }
    }

    displayTransactionTable(csvData, predictions) {
        const tableContainer = document.getElementById('transaction-table')
        if (!tableContainer) return
        
        let tableHTML = `
            <div class="overflow-x-auto">
                <table class="min-w-full bg-white dark:bg-gray-800 rounded-lg shadow">
                    <thead class="bg-gray-50 dark:bg-gray-700">
                        <tr>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Row</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Amount</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Prediction</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Confidence</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Risk Level</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-200 dark:divide-gray-600">
        `

        predictions.forEach((pred, index) => {
            const row = csvData.data[index]
            const amount = row.Amount || 0
            const isfraud = pred.prediction === 1
            const confidence = (pred.confidence * 100).toFixed(1)
            const riskLevel = this.getRiskLevel(pred.confidence, pred.prediction)
            
            tableHTML += `
                <tr class="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">${index + 1}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">$${amount.toFixed(2)}</td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <span class="px-2 py-1 text-xs font-semibold rounded-full ${isfraud ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'}">
                            ${isfraud ? 'Fraudulent' : 'Legitimate'}
                        </span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">${confidence}%</td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <span class="px-2 py-1 text-xs font-semibold rounded-full ${riskLevel.class}">
                            ${riskLevel.text}
                        </span>
                    </td>
                </tr>
            `
        })

        tableHTML += `
                    </tbody>
                </table>
            </div>
        `

        tableContainer.innerHTML = tableHTML
    }

    renderTop5(csvData, predictions) {
        const top5Container = document.getElementById('top5-container')
        if (!top5Container) return

        // Build combined rows with prediction info
        const rows = predictions.map((p, idx) => ({ ...csvData.data[idx], Prediction: p.prediction, Confidence: p.confidence }))
        // Filter predicted frauds and sort by confidence desc
        const highRisk = rows.filter(r => r.Prediction === 1).sort((a, b) => b.Confidence - a.Confidence).slice(0, 5)

        if (highRisk.length === 0) {
            top5Container.innerHTML = '<p class="text-sm text-gray-500 dark:text-gray-400">No high-risk transactions detected.</p>'
            return
        }

        let html = `
            <div class="overflow-x-auto">
                <table class="min-w-full bg-white dark:bg-gray-800 rounded-lg shadow">
                    <thead class="bg-gray-50 dark:bg-gray-700">
                        <tr>
                            <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300">#</th>
                            <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300">Amount</th>
                            <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300">Confidence</th>
                            <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300">Risk</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-200 dark:divide-gray-600">
        `

        highRisk.forEach((row, i) => {
            const amount = row.Amount || 0
            const confidence = (row.Confidence * 100).toFixed(1)
            const risk = confidence >= 80 ? 'High' : confidence >= 60 ? 'Medium' : 'Low'
            html += `
                <tr class="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <td class="px-4 py-2 text-sm text-gray-900 dark:text-gray-100">${i + 1}</td>
                    <td class="px-4 py-2 text-sm text-gray-900 dark:text-gray-100">$${amount.toFixed(2)}</td>
                    <td class="px-4 py-2 text-sm text-gray-900 dark:text-gray-100">${confidence}%</td>
                    <td class="px-4 py-2 text-sm text-gray-900 dark:text-gray-100">${risk}</td>
                </tr>
            `
        })

        html += `
                    </tbody>
                </table>
            </div>
        `

        top5Container.innerHTML = html
    }

    setupDownloadButton(csvData, predictions) {
        const btn = document.getElementById('download-predictions-btn')
        if (!btn) return

        btn.onclick = () => {
            // build rows with predictions
            const headers = csvData.headers.slice() // copy
            // Ensure prediction headers added
            if (!headers.includes('Prediction')) headers.push('Prediction')
            if (!headers.includes('Confidence')) headers.push('Confidence')

            const rows = csvData.data.map((r, idx) => {
                const copy = { ...r }
                copy.Prediction = predictions[idx].prediction
                copy.Confidence = predictions[idx].confidence
                return copy
            })

            const csvLines = [headers.join(',')]
            rows.forEach(row => {
                const line = headers.map(h => {
                    const v = row[h]
                    if (v === null || v === undefined) return ''
                    return typeof v === 'number' ? v : String(v).replace(/\n/g, ' ').replace(/,/g, '')
                }).join(',')
                csvLines.push(line)
            })

            const csvContent = csvLines.join('\n')
            // Try backend-assisted download if endpoint exists, otherwise use client-side blob
            this.tryBackendDownload(csvContent).catch(() => {
                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = 'predictions.csv'
                document.body.appendChild(a)
                a.click()
                document.body.removeChild(a)
                URL.revokeObjectURL(url)
            })
        }
    }

    renderFraudRateTrend(csvData, predictions) {
        // requires 'Time' column (epoch seconds) in csvData.headers
        if (!csvData.headers.includes('Time')) {
            // clear chart if no data
            this.chartManager.createTrendChart([], [])
            return
        }

        // Build map of date -> [predictions]
        const map = {}
        csvData.data.forEach((row, idx) => {
            // accept Time as seconds; convert to date string YYYY-MM-DD
            const t = row.Time || 0
            const d = new Date(t * 1000)
            if (isNaN(d.getTime())) return
            const key = d.toISOString().slice(0, 10)
            if (!map[key]) map[key] = []
            map[key].push(predictions[idx].prediction)
        })

        const dates = Object.keys(map).sort()
        const rates = dates.map(date => {
            const arr = map[date]
            const frauds = arr.filter(v => v === 1).length
            const rate = arr.length > 0 ? (frauds / arr.length) * 100 : 0
            return Number(rate.toFixed(2))
        })

        this.chartManager.createTrendChart(dates, rates)
    }

    async tryBackendDownload(csvContent) {
        try {
            // Convert csvContent to a Blob and send as FormData to backend
            const blob = new Blob([csvContent], { type: 'text/csv' })
            const form = new FormData()
            form.append('file', blob, 'upload.csv')

            const resp = await fetch('/predict_csv', {
                method: 'POST',
                body: form
            })

            if (!resp.ok) throw new Error('Backend download failed')

            const data = await resp.blob()
            const url = URL.createObjectURL(data)
            const a = document.createElement('a')
            a.href = url
            a.download = 'predictions.csv'
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            URL.revokeObjectURL(url)
        } catch (e) {
            throw e
        }
    }

    getRiskLevel(confidence, prediction) {
        if (prediction === 1) {
            if (confidence > 0.8) return { text: 'High Risk', class: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' }
            if (confidence > 0.6) return { text: 'Medium Risk', class: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' }
            return { text: 'Low Risk', class: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' }
        } else {
            return { text: 'Safe', class: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' }
        }
    }

    async loadSampleData() {
        this.uiManager.showLoading(true)
        
        try {
            // Generate sample data
            const sampleData = this.generateSampleData()
            await this.processData(sampleData)
        } catch (error) {
            console.error('Error loading sample data:', error)
            this.uiManager.showError('Error loading sample data: ' + error.message)
        } finally {
            this.uiManager.showLoading(false)
        }
    }

    generateSampleData() {
        const headers = ['Time', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6', 'V7', 'V8', 'V9', 'V10', 'V11', 'V12', 'V13', 'V14', 'V15', 'V16', 'V17', 'V18', 'V19', 'V20', 'V21', 'V22', 'V23', 'V24', 'V25', 'V26', 'V27', 'V28', 'Amount']
        const data = []

        for (let i = 0; i < 20; i++) {
            const row = {}
            headers.forEach(header => {
                if (header === 'Amount') {
                    row[header] = Math.random() * 1000 + 10
                } else if (header === 'Time') {
                    row[header] = Math.random() * 172800
                } else {
                    row[header] = (Math.random() - 0.5) * 4
                }
            })
            data.push(row)
        }

        return { headers, data }
    }
}

// Initialize app when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        console.log('DOM loaded, initializing app...')
        new App()
    })
} else {
    console.log('DOM already loaded, initializing app...')
    new App()
}