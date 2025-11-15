
// Chartered Accountant Platform - Main JavaScript

// Data Storage (using localStorage)
const storage = {
    clients: [],
    transactions: [],
    invoices: [],
    
    init: function() {
        try {
            this.clients = JSON.parse(localStorage.getItem('ca_clients') || '[]');
            this.transactions = JSON.parse(localStorage.getItem('ca_transactions') || '[]');
            this.invoices = JSON.parse(localStorage.getItem('ca_invoices') || '[]');
        } catch (error) {
            console.error('Error loading from localStorage:', error);
            this.clients = [];
            this.transactions = [];
            this.invoices = [];
        }
    },
    
    save: function(key, data) {
        try {
            localStorage.setItem(`ca_${key}`, JSON.stringify(data));
            this[key] = data;
            console.log(`Saved ${key}:`, data);
        } catch (error) {
            console.error(`Error saving ${key}:`, error);
            alert(`Error saving data: ${error.message}`);
        }
    },
    
    get: function(key) {
        return this[key] || [];
    }
};

// Initialize storage on load
storage.init();

// Initialize on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        initializeApp();
    });
} else {
    // Document is already loaded
    initializeApp();
}

function initializeApp() {
    try {
        // Set default dates
        const today = new Date().toISOString().split('T')[0];
        const invoiceDateEl = document.getElementById('invoice-date');
        const transactionDateEl = document.getElementById('transaction-date');
        
        if (invoiceDateEl) invoiceDateEl.value = today;
        if (transactionDateEl) transactionDateEl.value = today;
        
        // Load initial data
        loadClients();
        loadTransactions();
        loadInvoices();
        updateDashboard();
        loadComplianceCalendar();
        
        // Setup form handlers
        setupFormHandlers();
        
        // Initialize charts
        initializeCharts();
        
        console.log('CA Platform initialized successfully');
    } catch (error) {
        console.error('Error initializing app:', error);
    }
}

// Navigation
function showSection(sectionId) {
    // Hide all sections
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Show selected section
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.add('active');
    }
    
    // Update nav buttons
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
        // Find the corresponding nav button for the section
        if (btn.textContent.toLowerCase().includes(sectionId.replace('-', ' '))) {
            btn.classList.add('active');
        }
    });
    
    // Refresh section data
    if (sectionId === 'dashboard') {
        updateDashboard();
    } else if (sectionId === 'clients') {
        loadClients();
    } else if (sectionId === 'accounting') {
        loadTransactions();
    } else if (sectionId === 'invoices') {
        loadInvoices();
    } else if (sectionId === 'ai-insights') {
        refreshAIInsights();
    }
}

// Dashboard Functions
function updateDashboard() {
    const period = document.getElementById('period-select')?.value || 'month';
    const { startDate, endDate } = getDateRange(period);
    
    const transactions = storage.get('transactions').filter(t => {
        const tDate = new Date(t.date);
        return tDate >= startDate && tDate <= endDate;
    });
    
    const invoices = storage.get('invoices').filter(i => {
        const iDate = new Date(i.date);
        return iDate >= startDate && iDate <= endDate;
    });
    
    // Calculate metrics
    const revenue = transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
    
    const expenses = transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
    
    const profit = revenue - expenses;
    
    const pendingInvoices = invoices.filter(i => i.status === 'pending' || i.status === 'overdue').length;
    
    // Update UI
    document.getElementById('total-revenue')?.textContent = formatCurrency(revenue);
    document.getElementById('total-expenses')?.textContent = formatCurrency(expenses);
    document.getElementById('net-profit')?.textContent = formatCurrency(profit);
    document.getElementById('active-clients')?.textContent = storage.get('clients').length;
    document.getElementById('pending-invoices')?.textContent = pendingInvoices;
    
    // Calculate tax liability (simplified)
    const taxLiability = calculateTaxLiability(transactions);
    document.getElementById('tax-liability')?.textContent = formatCurrency(taxLiability);
    
    // Update charts
    updateCharts(transactions, period);
}

function getDateRange(period) {
    const today = new Date();
    const endDate = new Date(today);
    let startDate = new Date(today);
    
    switch(period) {
        case 'today':
            startDate.setHours(0, 0, 0, 0);
            break;
        case 'week':
            startDate.setDate(today.getDate() - 7);
            break;
        case 'month':
            startDate.setMonth(today.getMonth() - 1);
            break;
        case 'quarter':
            startDate.setMonth(today.getMonth() - 3);
            break;
        case 'year':
            startDate.setFullYear(today.getFullYear() - 1);
            break;
    }
    
    return { startDate, endDate };
}

// Client Management
function loadClients() {
    const grid = document.getElementById('clients-grid');
    if (!grid) return;

    // Try API first
    api.get('/api/clients').then(result => {
        if (result && result.success) {
            storage.save('clients', result.clients || []);
            renderClients(result.clients || []);
        } else {
            throw new Error('API returned no clients');
        }
    }).catch(() => {
        const clients = storage.get('clients');
        renderClients(clients);
    });

    function renderClients(clients) {
        grid.innerHTML = clients.length === 0
            ? '<p style="text-align: center; color: var(--text-light); padding: 2rem;">No clients added yet. Click "Add New Client" to get started.</p>'
            : clients.map(client => `
                <div class="client-card">
                    <h3>${client.name}</h3>
                    <p><strong>Type:</strong> ${formatBusinessType(client.businessType)}</p>
                    ${client.gstin ? `<p><strong>GSTIN:</strong> ${client.gstin}</p>` : ''}
                    ${client.pan ? `<p><strong>PAN:</strong> ${client.pan}</p>` : ''}
                    ${client.email ? `<p><strong>Email:</strong> ${client.email}</p>` : ''}
                    ${client.phone ? `<p><strong>Phone:</strong> ${client.phone}</p>` : ''}
                    <div style="margin-top: 1rem; display: flex; gap: 0.5rem;">
                        <button class="btn-secondary" onclick="editClient('${client.id}')" style="flex: 1;">Edit</button>
                        <button class="btn-secondary" onclick="deleteClient('${client.id}')" style="flex: 1;">Delete</button>
                    </div>
                </div>
            `).join('');
    }
}

function showClientModal() {
    const modal = document.getElementById('client-modal');
    const form = document.getElementById('client-form');
    
    if (!modal || !form) {
        console.error('Client modal or form not found');
        return;
    }
    
    modal.style.display = 'block';
    form.reset();
    form.dataset.mode = 'add';
    
    // Focus on first input
    document.getElementById('client-name')?.focus();
}

function editClient(clientId) {
    const client = storage.get('clients').find(c => c.id === clientId);
    if (!client) return;
    
    document.getElementById('client-name').value = client.name;
    document.getElementById('client-business-type').value = client.businessType;
    document.getElementById('client-gstin').value = client.gstin || '';
    document.getElementById('client-pan').value = client.pan || '';
    document.getElementById('client-email').value = client.email || '';
    document.getElementById('client-phone').value = client.phone || '';
    document.getElementById('client-address').value = client.address || '';
    
    document.getElementById('client-form').dataset.mode = 'edit';
    document.getElementById('client-form').dataset.clientId = clientId;
    document.getElementById('client-modal').style.display = 'block';
}

function deleteClient(clientId) {
    if (!confirm('Are you sure you want to delete this client?')) return;
    // Try API delete
    api.delete(`/api/clients/${clientId}`).then(res => {
        if (res && res.success) {
            loadClients();
            updateDashboard();
        } else {
            throw new Error('Delete failed');
        }
    }).catch(() => {
        const clients = storage.get('clients').filter(c => c.id !== clientId);
        storage.save('clients', clients);
        loadClients();
        updateDashboard();
    });
}

function formatBusinessType(type) {
    const types = {
        'sole-proprietor': 'Sole Proprietor',
        'partnership': 'Partnership',
        'llp': 'LLP',
        'private-limited': 'Private Limited',
        'public-limited': 'Public Limited'
    };
    return types[type] || type;
}

// Transaction Management
function loadTransactions() {
    const tbody = document.getElementById('transactions-body');
    if (!tbody) return;

    // Try API
    api.get('/api/transactions').then(result => {
        if (result && result.success) {
            storage.save('transactions', result.transactions || []);
            renderTransactions(result.transactions || []);
        } else throw new Error('No transactions');
    }).catch(() => {
        const transactions = storage.get('transactions');
        renderTransactions(transactions);
    });

    function renderTransactions(transactions) {
        tbody.innerHTML = transactions.length === 0
            ? '<tr><td colspan="7" style="text-align: center; padding: 2rem; color: var(--text-light);">No transactions recorded yet.</td></tr>'
            : transactions.slice().reverse().map(transaction => `
                <tr>
                    <td>${formatDate(transaction.date)}</td>
                    <td>${getClientName(transaction.clientId)}</td>
                    <td><span class="badge badge-${transaction.type}">${transaction.type}</span></td>
                    <td>${transaction.category}</td>
                    <td>${transaction.description || '-'}</td>
                    <td>${formatCurrency(transaction.amount)}</td>
                    <td>
                        <button class="btn-icon" onclick="editTransaction('${transaction.id}')">✏️</button>
                        <button class="btn-icon" onclick="deleteTransaction('${transaction.id}')">🗑️</button>
                    </td>
                </tr>
            `).join('');
    }
}

function showTransactionModal() {
    const modal = document.getElementById('transaction-modal');
    const form = document.getElementById('transaction-form');
    
    if (!modal || !form) {
        console.error('Transaction modal or form not found');
        return;
    }
    
    modal.style.display = 'block';
    form.reset();
    form.dataset.mode = 'add';
    
    // Populate client dropdown
    const clientSelect = document.getElementById('transaction-client');
    if (clientSelect) {
        const clients = storage.get('clients');
        if (clients && clients.length > 0) {
            clientSelect.innerHTML = '<option value="">Select Client</option>' +
                clients.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
        } else {
            clientSelect.innerHTML = '<option value="">No clients available</option>';
        }
    }
    
    // Set default date
    const today = new Date().toISOString().split('T')[0];
    const transactionDateEl = document.getElementById('transaction-date');
    if (transactionDateEl) {
        transactionDateEl.value = today;
    }
}

function updateTransactionCategories() {
    const type = document.getElementById('transaction-type').value;
    const categorySelect = document.getElementById('transaction-category');
    if (!categorySelect) return;
    
    const categories = {
        income: ['Service Revenue', 'Product Sales', 'Interest Income', 'Other Income'],
        expense: ['Office Rent', 'Salaries', 'Utilities', 'Marketing', 'Travel', 'Supplies', 'Other Expenses'],
        asset: ['Cash', 'Bank Account', 'Accounts Receivable', 'Inventory', 'Equipment', 'Property'],
        liability: ['Accounts Payable', 'Loans', 'Tax Payable', 'Other Liabilities']
    };
    
    categorySelect.innerHTML = '<option value="">Select Category</option>' +
        (categories[type] || []).map(cat => `<option value="${cat}">${cat}</option>`).join('');
}

function editTransaction(transactionId) {
    const transaction = storage.get('transactions').find(t => t.id === transactionId);
    if (!transaction) return;
    
    document.getElementById('transaction-date').value = transaction.date;
    document.getElementById('transaction-client').value = transaction.clientId;
    document.getElementById('transaction-type').value = transaction.type;
    updateTransactionCategories();
    document.getElementById('transaction-category').value = transaction.category;
    document.getElementById('transaction-description').value = transaction.description || '';
    document.getElementById('transaction-amount').value = transaction.amount;
    document.getElementById('transaction-payment-method').value = transaction.paymentMethod || 'bank';
    document.getElementById('transaction-reference').value = transaction.reference || '';
    
    document.getElementById('transaction-form').dataset.mode = 'edit';
    document.getElementById('transaction-form').dataset.transactionId = transactionId;
    document.getElementById('transaction-modal').style.display = 'block';
}

function deleteTransaction(transactionId) {
    if (!confirm('Are you sure you want to delete this transaction?')) return;
    api.delete(`/api/transactions/${transactionId}`).then(res => {
        if (res && res.success) {
            loadTransactions();
            updateDashboard();
        } else throw new Error('Delete failed');
    }).catch(() => {
        const transactions = storage.get('transactions').filter(t => t.id !== transactionId);
        storage.save('transactions', transactions);
        loadTransactions();
        updateDashboard();
    });
}

function filterTransactions() {
    // Implementation for filtering transactions
    loadTransactions();
}

// Invoice Management
function loadInvoices() {
    const grid = document.getElementById('invoices-grid');
    if (!grid) return;

    api.get('/api/invoices').then(result => {
        if (result && result.success) {
            storage.save('invoices', result.invoices || []);
            renderInvoices(result.invoices || []);
        } else throw new Error('No invoices');
    }).catch(() => {
        const invoices = storage.get('invoices');
        renderInvoices(invoices);
    });

    function renderInvoices(invoices) {
        grid.innerHTML = invoices.length === 0
            ? '<p style="text-align: center; color: var(--text-light); padding: 2rem;">No invoices created yet.</p>'
            : invoices.slice().reverse().map(invoice => {
                const client = storage.get('clients').find(c => c.id === invoice.clientId);
                const status = getInvoiceStatus(invoice);
                return `
                    <div class="invoice-card">
                        <h3>Invoice #${invoice.number}</h3>
                        <p><strong>Client:</strong> ${client?.name || 'Unknown'}</p>
                        <p><strong>Date:</strong> ${formatDate(invoice.date)}</p>
                        <p><strong>Due Date:</strong> ${formatDate(invoice.dueDate)}</p>
                        <p><strong>Amount:</strong> ${formatCurrency(invoice.total)}</p>
                        <span class="invoice-status ${status}">${status.charAt(0).toUpperCase() + status.slice(1)}</span>
                        <div style="margin-top: 1rem; display: flex; gap: 0.5rem;">
                            <button class="btn-secondary" onclick="viewInvoice('${invoice.id}')" style="flex: 1;">View</button>
                            <button class="btn-secondary" onclick="markInvoicePaid('${invoice.id}')" style="flex: 1;">Mark Paid</button>
                        </div>
                    </div>
                `;
            }).join('');
    }
}

function showInvoiceModal() {
    const modal = document.getElementById('invoice-modal');
    const form = document.getElementById('invoice-form');
    
    if (!modal || !form) {
        console.error('Invoice modal or form not found');
        return;
    }
    
    modal.style.display = 'block';
    form.reset();
    form.dataset.mode = 'add';
    
    // Populate client dropdown
    const clientSelect = document.getElementById('invoice-client');
    if (clientSelect) {
        const clients = storage.get('clients');
        if (clients && clients.length > 0) {
            clientSelect.innerHTML = '<option value="">Select Client</option>' +
                clients.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
        } else {
            clientSelect.innerHTML = '<option value="">No clients available</option>';
        }
    }
    
    // Set default dates
    const today = new Date().toISOString().split('T')[0];
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);
    
    const invoiceDateEl = document.getElementById('invoice-date');
    const dueDateEl = document.getElementById('invoice-due-date');
    
    if (invoiceDateEl) invoiceDateEl.value = today;
    if (dueDateEl) dueDateEl.value = dueDate.toISOString().split('T')[0];
    
    // Generate invoice number
    const invoiceCount = storage.get('invoices').length;
    const invoiceNumberEl = document.getElementById('invoice-number');
    if (invoiceNumberEl) {
        invoiceNumberEl.value = `INV-${String(invoiceCount + 1).padStart(4, '0')}`;
    }
    
    // Reset items
    const itemsListEl = document.getElementById('invoice-items-list');
    if (itemsListEl) {
        itemsListEl.innerHTML = `
            <div class="invoice-item">
                <input type="text" placeholder="Description" class="item-description" oninput="updateInvoiceTotal()">
                <input type="number" placeholder="Qty" class="item-quantity" min="1" value="1" oninput="updateInvoiceTotal()">
                <input type="number" placeholder="Rate" class="item-rate" step="0.01" oninput="updateInvoiceTotal()">
                <input type="number" placeholder="Tax %" class="item-tax" step="0.01" value="18" oninput="updateInvoiceTotal()">
                <span class="item-total">₹0.00</span>
                <button type="button" class="btn-icon" onclick="removeInvoiceItem(this)">🗑️</button>
            </div>
        `;
    }
    
    updateInvoiceTotal();
}

function addInvoiceItem() {
    const itemsList = document.getElementById('invoice-items-list');
    const newItem = document.createElement('div');
    newItem.className = 'invoice-item';
    newItem.innerHTML = `
        <input type="text" placeholder="Description" class="item-description" oninput="updateInvoiceTotal()">
        <input type="number" placeholder="Qty" class="item-quantity" min="1" value="1" oninput="updateInvoiceTotal()">
        <input type="number" placeholder="Rate" class="item-rate" step="0.01" oninput="updateInvoiceTotal()">
        <input type="number" placeholder="Tax %" class="item-tax" step="0.01" value="18" oninput="updateInvoiceTotal()">
        <span class="item-total">₹0.00</span>
        <button type="button" class="btn-icon" onclick="removeInvoiceItem(this)">🗑️</button>
    `;
    itemsList.appendChild(newItem);
}

function removeInvoiceItem(button) {
    const itemsList = document.getElementById('invoice-items-list');
    if (itemsList.children.length > 1) {
        button.closest('.invoice-item').remove();
        updateInvoiceTotal();
    }
}

function updateInvoiceTotal() {
    const items = document.querySelectorAll('.invoice-item');
    let subtotal = 0;
    let totalTax = 0;
    
    items.forEach(item => {
        const qty = parseFloat(item.querySelector('.item-quantity').value || 0);
        const rate = parseFloat(item.querySelector('.item-rate').value || 0);
        const tax = parseFloat(item.querySelector('.item-tax').value || 0);
        
        const itemSubtotal = qty * rate;
        const itemTax = itemSubtotal * (tax / 100);
        const itemTotal = itemSubtotal + itemTax;
        
        item.querySelector('.item-total').textContent = formatCurrency(itemTotal);
        subtotal += itemSubtotal;
        totalTax += itemTax;
    });
    
    document.getElementById('invoice-subtotal').textContent = formatCurrency(subtotal);
    document.getElementById('invoice-tax').textContent = formatCurrency(totalTax);
    document.getElementById('invoice-total').textContent = formatCurrency(subtotal + totalTax);
}

function getInvoiceStatus(invoice) {
    const today = new Date();
    const dueDate = new Date(invoice.dueDate);
    
    if (invoice.status === 'paid') return 'paid';
    if (dueDate < today) return 'overdue';
    return 'pending';
}

function markInvoicePaid(invoiceId) {
    // Try API update
    api.put(`/api/invoices/${invoiceId}`, { status: 'paid' }).then(res => {
        if (res && res.success) {
            loadInvoices();
            updateDashboard();
        } else throw new Error('Update failed');
    }).catch(() => {
        const invoices = storage.get('invoices');
        const invoice = invoices.find(i => i.id === invoiceId);
        if (invoice) {
            invoice.status = 'paid';
            storage.save('invoices', invoices);
            loadInvoices();
            updateDashboard();
        }
    });
}

// Tax Calculations
function calculateGST() {
    const baseAmount = parseFloat(document.getElementById('gst-base-amount').value || 0);
    const rate = parseFloat(document.getElementById('gst-rate').value || 18);
    
    const gstAmount = baseAmount * (rate / 100);
    const total = baseAmount + gstAmount;
    
    document.getElementById('gst-base-result').textContent = formatCurrency(baseAmount);
    document.getElementById('gst-amount-result').textContent = formatCurrency(gstAmount);
    document.getElementById('gst-total-result').textContent = formatCurrency(total);
}

function calculateIncomeTax() {
    const annualIncome = parseFloat(document.getElementById('annual-income').value || 0);
    const regime = document.getElementById('tax-regime').value;
    
    let taxableIncome = annualIncome;
    let tax = 0;
    
    if (regime === 'old') {
        // Old regime with standard deduction
        taxableIncome = Math.max(0, annualIncome - 50000); // Standard deduction
        
        if (taxableIncome <= 250000) {
            tax = 0;
        } else if (taxableIncome <= 500000) {
            tax = (taxableIncome - 250000) * 0.05;
        } else if (taxableIncome <= 1000000) {
            tax = 12500 + (taxableIncome - 500000) * 0.20;
        } else {
            tax = 112500 + (taxableIncome - 1000000) * 0.30;
        }
    } else {
        // New regime
        if (taxableIncome <= 300000) {
            tax = 0;
        } else if (taxableIncome <= 700000) {
            tax = (taxableIncome - 300000) * 0.05;
        } else if (taxableIncome <= 1000000) {
            tax = 20000 + (taxableIncome - 700000) * 0.10;
        } else if (taxableIncome <= 1200000) {
            tax = 50000 + (taxableIncome - 1000000) * 0.15;
        } else if (taxableIncome <= 1500000) {
            tax = 80000 + (taxableIncome - 1200000) * 0.20;
        } else {
            tax = 140000 + (taxableIncome - 1500000) * 0.30;
        }
    }
    
    const cess = tax * 0.04;
    const totalTax = tax + cess;
    
    document.getElementById('taxable-income').textContent = formatCurrency(taxableIncome);
    document.getElementById('tax-payable').textContent = formatCurrency(tax);
    document.getElementById('tax-cess').textContent = formatCurrency(cess);
    document.getElementById('total-tax').textContent = formatCurrency(totalTax);
}

function calculateTaxLiability(transactions) {
    // Simplified tax calculation
    const income = transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
    
    return income * 0.18; // Assuming 18% GST on services
}

// Accounting Tabs
function showAccountingTab(tabName) {
    document.querySelectorAll('.accounting-tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelectorAll('.accounting-tabs .tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    const targetTab = document.getElementById(`${tabName}-tab`);
    if (targetTab) {
        targetTab.classList.add('active');
    }
    
    // Update button state
    event?.target?.classList.add('active');
}

function showTaxTab(tabName) {
    document.querySelectorAll('.tax-tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelectorAll('.tax-tabs .tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    const targetTab = document.getElementById(`${tabName}-tab`);
    if (targetTab) {
        targetTab.classList.add('active');
    }
    
    // Update button state
    event?.target?.classList.add('active');
}

// Reports
function generateFinancialReport() {
    const reportType = document.getElementById('report-type').value;
    const dateFrom = document.getElementById('report-date-from').value;
    const dateTo = document.getElementById('report-date-to').value;
    
    if (!dateFrom || !dateTo) {
        alert('Please select date range');
        return;
    }
    
    const transactions = storage.get('transactions').filter(t => {
        const tDate = new Date(t.date);
        const from = new Date(dateFrom);
        const to = new Date(dateTo);
        return tDate >= from && tDate <= to;
    });
    
    const container = document.getElementById('report-container');
    let reportHTML = '';
    
    switch(reportType) {
        case 'pl':
            reportHTML = generateProfitLossReport(transactions);
            break;
        case 'balance-sheet':
            reportHTML = generateBalanceSheet(transactions);
            break;
        case 'cash-flow':
            reportHTML = generateCashFlowReport(transactions);
            break;
        case 'trial-balance':
            reportHTML = generateTrialBalance(transactions);
            break;
        default:
            reportHTML = '<p>Report type not implemented yet.</p>';
    }
    
    container.innerHTML = reportHTML;
}

function generateProfitLossReport(transactions) {
    const income = transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
    
    const expenses = transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
    
    const profit = income - expenses;
    
    return `
        <h2>Profit & Loss Statement</h2>
        <table style="width: 100%; margin-top: 2rem;">
            <tr>
                <th style="text-align: left;">Revenue</th>
                <th style="text-align: right;">Amount (₹)</th>
            </tr>
            <tr>
                <td>Total Income</td>
                <td style="text-align: right;">${formatCurrency(income)}</td>
            </tr>
            <tr>
                <th style="text-align: left; padding-top: 1rem;">Expenses</th>
                <th></th>
            </tr>
            <tr>
                <td>Total Expenses</td>
                <td style="text-align: right;">${formatCurrency(expenses)}</td>
            </tr>
            <tr style="border-top: 2px solid var(--primary); font-weight: bold; font-size: 1.25rem;">
                <td>Net Profit</td>
                <td style="text-align: right; color: ${profit >= 0 ? 'var(--success)' : 'var(--danger)'};">${formatCurrency(profit)}</td>
            </tr>
        </table>
    `;
}

function generateBalanceSheet(transactions) {
    const assets = transactions
        .filter(t => t.type === 'asset')
        .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
    
    const liabilities = transactions
        .filter(t => t.type === 'liability')
        .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
    
    const income = transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
    
    const expenses = transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
    
    const equity = assets - liabilities + (income - expenses);
    
    return `
        <h2>Balance Sheet</h2>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; margin-top: 2rem;">
            <div>
                <h3>Assets</h3>
                <table style="width: 100%;">
                    <tr>
                        <td>Total Assets</td>
                        <td style="text-align: right;">${formatCurrency(assets)}</td>
                    </tr>
                </table>
            </div>
            <div>
                <h3>Liabilities & Equity</h3>
                <table style="width: 100%;">
                    <tr>
                        <td>Total Liabilities</td>
                        <td style="text-align: right;">${formatCurrency(liabilities)}</td>
                    </tr>
                    <tr>
                        <td>Equity</td>
                        <td style="text-align: right;">${formatCurrency(equity)}</td>
                    </tr>
                    <tr style="border-top: 2px solid var(--primary); font-weight: bold;">
                        <td>Total</td>
                        <td style="text-align: right;">${formatCurrency(liabilities + equity)}</td>
                    </tr>
                </table>
            </div>
        </div>
    `;
}

function generateCashFlowReport(transactions) {
    const cashInflows = transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
    
    const cashOutflows = transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
    
    const netCashFlow = cashInflows - cashOutflows;
    
    return `
        <h2>Cash Flow Statement</h2>
        <table style="width: 100%; margin-top: 2rem;">
            <tr>
                <th style="text-align: left;">Cash Inflows</th>
                <th style="text-align: right;">Amount (₹)</th>
            </tr>
            <tr>
                <td>Operating Activities</td>
                <td style="text-align: right;">${formatCurrency(cashInflows)}</td>
            </tr>
            <tr>
                <th style="text-align: left; padding-top: 1rem;">Cash Outflows</th>
                <th></th>
            </tr>
            <tr>
                <td>Operating Activities</td>
                <td style="text-align: right;">${formatCurrency(cashOutflows)}</td>
            </tr>
            <tr style="border-top: 2px solid var(--primary); font-weight: bold; font-size: 1.25rem;">
                <td>Net Cash Flow</td>
                <td style="text-align: right; color: ${netCashFlow >= 0 ? 'var(--success)' : 'var(--danger)'};">${formatCurrency(netCashFlow)}</td>
            </tr>
        </table>
    `;
}

function generateTrialBalance(transactions) {
    const accounts = {};
    
    transactions.forEach(t => {
        if (!accounts[t.category]) {
            accounts[t.category] = { debit: 0, credit: 0 };
        }
        if (t.type === 'expense' || t.type === 'asset') {
            accounts[t.category].debit += parseFloat(t.amount || 0);
        } else {
            accounts[t.category].credit += parseFloat(t.amount || 0);
        }
    });
    
    let totalDebit = 0;
    let totalCredit = 0;
    
    const rows = Object.entries(accounts).map(([account, amounts]) => {
        totalDebit += amounts.debit;
        totalCredit += amounts.credit;
        return `
            <tr>
                <td>${account}</td>
                <td style="text-align: right;">${formatCurrency(amounts.debit)}</td>
                <td style="text-align: right;">${formatCurrency(amounts.credit)}</td>
            </tr>
        `;
    }).join('');
    
    return `
        <h2>Trial Balance</h2>
        <table style="width: 100%; margin-top: 2rem;">
            <tr>
                <th style="text-align: left;">Account</th>
                <th style="text-align: right;">Debit (₹)</th>
                <th style="text-align: right;">Credit (₹)</th>
            </tr>
            ${rows}
            <tr style="border-top: 2px solid var(--primary); font-weight: bold;">
                <td>Total</td>
                <td style="text-align: right;">${formatCurrency(totalDebit)}</td>
                <td style="text-align: right;">${formatCurrency(totalCredit)}</td>
            </tr>
        </table>
    `;
}

// AI Insights
function refreshAIInsights() {
    const insightsPanel = document.getElementById('insights-panel');
    if (!insightsPanel) return;
    
    insightsPanel.innerHTML = '<div class="insight-loading"><p>Analyzing your business data...</p></div>';
    
    // Simulate AI analysis
    setTimeout(() => {
        const insights = generateAIInsights();
        displayInsights(insights);
    }, 1000);
}

function showInsightCategory(category) {
    document.querySelectorAll('.insight-category-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Update button state
    if (event?.target?.classList) {
        event.target.classList.add('active');
    }
    
    refreshAIInsights();
}

function generateAIInsights() {
    const transactions = storage.get('transactions');
    const invoices = storage.get('invoices');
    const clients = storage.get('clients');
    
    const income = transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
    
    const expenses = transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
    
    const profit = income - expenses;
    const profitMargin = income > 0 ? (profit / income) * 100 : 0;
    
    const pendingInvoices = invoices.filter(i => i.status === 'pending' || i.status === 'overdue');
    const overdueInvoices = invoices.filter(i => {
        const dueDate = new Date(i.dueDate);
        return dueDate < new Date() && i.status !== 'paid';
    });
    
    const overdueAmount = overdueInvoices.reduce((sum, i) => sum + parseFloat(i.total || 0), 0);
    
    const activeCategory = document.querySelector('.insight-category-btn.active')?.textContent || '';
    let insights = [];
    
    // Profit Optimization Insights
    if (activeCategory.includes('Profit') || !activeCategory) {
        if (profitMargin < 10 && income > 0) {
            insights.push({
                title: 'Low Profit Margin Detected',
                description: `Your current profit margin is ${profitMargin.toFixed(1)}%. Industry average is 15-20%. Consider reviewing your pricing strategy or reducing operational costs.`,
                action: 'Review Pricing Strategy',
                priority: 'high',
                impact: `Potential increase: ₹${formatCurrency(income * 0.15 - profit)}`
            });
        }
        
        if (expenses > income * 0.7) {
            insights.push({
                title: 'High Expense Ratio',
                description: `Your expenses represent ${((expenses/income)*100).toFixed(1)}% of revenue. Focus on cost optimization in high-expense categories.`,
                action: 'Analyze Expense Categories',
                priority: 'high',
                impact: `Potential savings: ₹${formatCurrency(expenses * 0.1)}`
            });
        }
        
        if (profit > 0 && profitMargin > 20) {
            insights.push({
                title: 'Excellent Profitability',
                description: `Great job! Your profit margin of ${profitMargin.toFixed(1)}% is above industry standards. Consider reinvesting profits for growth.`,
                action: 'Explore Growth Opportunities',
                priority: 'low',
                impact: 'Growth potential identified'
            });
        }
    }
    
    // Cost Reduction Insights
    if (activeCategory.includes('Cost')) {
        const expenseCategories = {};
        transactions.filter(t => t.type === 'expense').forEach(t => {
            expenseCategories[t.category] = (expenseCategories[t.category] || 0) + parseFloat(t.amount || 0);
        });
        
        const topExpense = Object.entries(expenseCategories).sort((a, b) => b[1] - a[1])[0];
        if (topExpense && topExpense[1] > expenses * 0.3) {
            insights.push({
                title: 'Major Expense Category Identified',
                description: `${topExpense[0]} accounts for ${((topExpense[1]/expenses)*100).toFixed(1)}% of total expenses. Review this category for optimization opportunities.`,
                action: 'Review ' + topExpense[0],
                priority: 'medium',
                impact: `Potential savings: ₹${formatCurrency(topExpense[1] * 0.15)}`
            });
        }
        
        if (expenses > 0) {
            insights.push({
                title: 'Automated Cost Tracking',
                description: 'Consider implementing automated expense tracking to identify recurring costs and subscription services that may be underutilized.',
                action: 'Set Up Expense Alerts',
                priority: 'medium',
                impact: 'Improved cost visibility'
            });
        }
    }
    
    // Growth Opportunities
    if (activeCategory.includes('Growth')) {
        if (clients.length < 10) {
            insights.push({
                title: 'Client Base Expansion Opportunity',
                description: `You currently have ${clients.length} clients. Expanding your client base by 20% could increase revenue by approximately ₹${formatCurrency(income * 0.2)}.`,
                action: 'Develop Marketing Strategy',
                priority: 'medium',
                impact: `Potential revenue: ₹${formatCurrency(income * 0.2)}`
            });
        }
        
        const avgClientValue = clients.length > 0 ? income / clients.length : 0;
        if (avgClientValue > 0) {
            insights.push({
                title: 'Client Value Optimization',
                description: `Average client value is ₹${formatCurrency(avgClientValue)}. Consider upselling additional services to existing clients.`,
                action: 'Review Client Services',
                priority: 'low',
                impact: `Potential increase: ₹${formatCurrency(avgClientValue * clients.length * 0.15)}`
            });
        }
        
        if (income > 0 && profitMargin > 15) {
            insights.push({
                title: 'Investment Opportunity',
                description: 'Strong profitability indicates capacity for strategic investments in technology, marketing, or team expansion.',
                action: 'Plan Strategic Investments',
                priority: 'low',
                impact: 'Long-term growth potential'
            });
        }
    }
    
    // Risk Management
    if (activeCategory.includes('Risk')) {
        if (overdueInvoices.length > 0) {
            insights.push({
                title: 'Overdue Invoices Risk',
                description: `You have ${overdueInvoices.length} overdue invoices totaling ₹${formatCurrency(overdueAmount)}. This impacts cash flow and increases collection risk.`,
                action: 'Follow Up on Overdue Invoices',
                priority: 'high',
                impact: `At risk: ₹${formatCurrency(overdueAmount)}`
            });
        }
        
        if (pendingInvoices.length > 5) {
            insights.push({
                title: 'High Pending Invoice Volume',
                description: `You have ${pendingInvoices.length} pending invoices. Implement automated payment reminders to improve collection rates.`,
                action: 'Set Up Payment Reminders',
                priority: 'medium',
                impact: 'Improved cash flow'
            });
        }
        
        const clientConcentration = clients.length > 0 ? (income / Math.max(clients.length, 1)) : 0;
        if (clients.length < 5 && income > 0) {
            insights.push({
                title: 'Client Concentration Risk',
                description: `You have a small client base (${clients.length} clients). Diversifying your client portfolio reduces business risk.`,
                action: 'Develop New Client Acquisition',
                priority: 'medium',
                impact: 'Reduced business risk'
            });
        }
    }
    
    // Cash Flow Insights
    if (activeCategory.includes('Cash Flow')) {
        const unpaidInvoices = invoices.filter(i => i.status !== 'paid');
        const unpaidAmount = unpaidInvoices.reduce((sum, i) => sum + parseFloat(i.total || 0), 0);
        
        if (unpaidAmount > income * 0.3) {
            insights.push({
                title: 'Cash Flow Constraint',
                description: `Unpaid invoices (₹${formatCurrency(unpaidAmount)}) represent a significant portion of revenue. Accelerate collections to improve cash flow.`,
                action: 'Implement Collection Strategy',
                priority: 'high',
                impact: `Potential cash inflow: ₹${formatCurrency(unpaidAmount)}`
            });
        }
        
        if (expenses > income * 0.8) {
            insights.push({
                title: 'Tight Cash Flow Margin',
                description: 'Your expenses are very close to income, leaving minimal cash buffer. Consider building a cash reserve for unexpected expenses.',
                action: 'Build Cash Reserve',
                priority: 'high',
                impact: 'Improved financial stability'
            });
        }
        
        const avgPaymentDays = invoices.length > 0 ? 
            invoices.filter(i => i.status === 'paid').length * 30 / invoices.length : 0;
        if (avgPaymentDays > 45) {
            insights.push({
                title: 'Slow Payment Collection',
                description: `Average payment collection appears slow. Consider offering early payment discounts or implementing stricter payment terms.`,
                action: 'Review Payment Terms',
                priority: 'medium',
                impact: 'Faster cash collection'
            });
        }
    }
    
    // Default insights if none generated
    if (insights.length === 0) {
        insights.push({
            title: 'Getting Started',
            description: 'Add clients, transactions, and invoices to receive personalized AI-powered business insights and recommendations.',
            action: 'Add Your First Client',
            priority: 'low',
            impact: 'Start tracking your business'
        });
    }
    
    return insights;
}

function displayInsights(insights) {
    const panel = document.getElementById('insights-panel');
    if (!panel) return;
    
    if (insights.length === 0) {
        panel.innerHTML = '<div class="insight-loading"><p>No insights available at this time.</p></div>';
        return;
    }
    
    panel.innerHTML = insights.map(insight => `
        <div class="insight-item">
            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 0.5rem;">
                <h4>${insight.title}</h4>
                <span style="padding: 0.25rem 0.75rem; border-radius: 12px; font-size: 0.75rem; font-weight: 600; background: ${
                    insight.priority === 'high' ? '#fee2e2' : 
                    insight.priority === 'medium' ? '#fef3c7' : '#d1fae5'
                }; color: ${
                    insight.priority === 'high' ? '#dc2626' : 
                    insight.priority === 'medium' ? '#d97706' : '#059669'
                };">
                    ${insight.priority.toUpperCase()}
                </span>
            </div>
            <p>${insight.description}</p>
            <div style="margin-top: 0.75rem; padding-top: 0.75rem; border-top: 1px solid var(--border);">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <strong style="color: var(--primary);">Impact:</strong> ${insight.impact}
                    </div>
                    <button class="btn-primary" style="padding: 0.5rem 1rem; font-size: 0.875rem;" onclick="handleInsightAction('${insight.action}')">
                        ${insight.action}
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

function handleInsightAction(action) {
    if (action.includes('Client') || action.includes('client')) {
        showSection('clients');
        showClientModal();
    } else if (action.includes('Invoice') || action.includes('invoice') || action.includes('Payment')) {
        showSection('invoices');
    } else if (action.includes('Transaction') || action.includes('Expense') || action.includes('expense')) {
        showSection('accounting');
        showTransactionModal();
    } else if (action.includes('Report') || action.includes('report')) {
        showSection('reports');
    } else {
        alert(`Action: ${action}\n\nThis feature will guide you to the relevant section.`);
    }
}

// Charts
let revenueExpenseChart = null;
let profitTrendChart = null;

function initializeCharts() {
    updateCharts([], 'month');
}

function updateCharts(transactions, period) {
    const labels = getChartLabels(period);
    
    // Revenue vs Expenses Chart
    const revenueData = labels.map(() => {
        const date = new Date();
        return transactions
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0) / labels.length;
    });
    
    const expenseData = labels.map(() => {
        return transactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0) / labels.length;
    });
    
    const revenueCtx = document.getElementById('revenue-expense-chart');
    if (revenueCtx) {
        if (revenueExpenseChart) {
            revenueExpenseChart.destroy();
        }
        revenueExpenseChart = new Chart(revenueCtx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Revenue',
                    data: revenueData,
                    borderColor: '#2563eb',
                    backgroundColor: 'rgba(37, 99, 235, 0.1)',
                    tension: 0.4
                }, {
                    label: 'Expenses',
                    data: expenseData,
                    borderColor: '#dc2626',
                    backgroundColor: 'rgba(220, 38, 38, 0.1)',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }
    
    // Profit Trend Chart
    const profitData = labels.map(() => {
        const income = transactions
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0) / labels.length;
        const expenses = transactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0) / labels.length;
        return income - expenses;
    });
    
    const profitCtx = document.getElementById('profit-trend-chart');
    if (profitCtx) {
        if (profitTrendChart) {
            profitTrendChart.destroy();
        }
        profitTrendChart = new Chart(profitCtx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Net Profit',
                    data: profitData,
                    backgroundColor: profitData.map(p => p >= 0 ? 'rgba(5, 150, 105, 0.8)' : 'rgba(220, 38, 38, 0.8)'),
                    borderColor: profitData.map(p => p >= 0 ? '#059669' : '#dc2626'),
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }
}

function getChartLabels(period) {
    const labels = [];
    const today = new Date();
    
    switch(period) {
        case 'today':
            for (let i = 0; i < 24; i++) {
                labels.push(`${i}:00`);
            }
            break;
        case 'week':
            for (let i = 6; i >= 0; i--) {
                const date = new Date(today);
                date.setDate(date.getDate() - i);
                labels.push(date.toLocaleDateString('en-US', { weekday: 'short' }));
            }
            break;
        case 'month':
            for (let i = 3; i >= 0; i--) {
                const date = new Date(today);
                date.setDate(date.getDate() - (i * 7));
                labels.push(`Week ${4 - i}`);
            }
            break;
        case 'quarter':
            for (let i = 2; i >= 0; i--) {
                const date = new Date(today);
                date.setMonth(date.getMonth() - i);
                labels.push(date.toLocaleDateString('en-US', { month: 'short' }));
            }
            break;
        case 'year':
            for (let i = 11; i >= 0; i--) {
                const date = new Date(today);
                date.setMonth(date.getMonth() - i);
                labels.push(date.toLocaleDateString('en-US', { month: 'short' }));
            }
            break;
    }
    
    return labels;
}

// Compliance Calendar
function loadComplianceCalendar() {
    const complianceList = document.getElementById('compliance-list');
    if (!complianceList) return;
    
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    
    const complianceItems = [
        {
            title: 'GST Return Filing (GSTR-3B)',
            dueDate: new Date(currentYear, currentMonth, 20),
            frequency: 'Monthly',
            status: 'pending'
        },
        {
            title: 'TDS Return Filing (Form 26Q)',
            dueDate: new Date(currentYear, currentMonth, 15),
            frequency: 'Quarterly',
            status: 'pending'
        },
        {
            title: 'Income Tax Return Filing',
            dueDate: new Date(currentYear, 6, 31), // July 31
            frequency: 'Annual',
            status: 'pending'
        },
        {
            title: 'Annual Compliance Certificate',
            dueDate: new Date(currentYear, 8, 30), // September 30
            frequency: 'Annual',
            status: 'pending'
        }
    ];
    
    complianceList.innerHTML = complianceItems.map(item => {
        const daysUntil = Math.ceil((item.dueDate - today) / (1000 * 60 * 60 * 24));
        const isDueSoon = daysUntil <= 7 && daysUntil >= 0;
        const isOverdue = daysUntil < 0;
        
        return `
            <div class="compliance-item ${isOverdue ? 'due-soon' : isDueSoon ? 'due-soon' : ''}">
                <div style="display: flex; justify-content: space-between; align-items: start;">
                    <div>
                        <h4>${item.title}</h4>
                        <p style="color: var(--text-light); font-size: 0.875rem; margin-top: 0.25rem;">
                            Due: ${formatDate(item.dueDate.toISOString().split('T')[0])} • ${item.frequency}
                        </p>
                    </div>
                    <span style="padding: 0.25rem 0.75rem; border-radius: 12px; font-size: 0.75rem; font-weight: 600; background: ${
                        isOverdue ? '#fee2e2' : isDueSoon ? '#fef3c7' : '#d1fae5'
                    }; color: ${
                        isOverdue ? '#dc2626' : isDueSoon ? '#d97706' : '#059669'
                    };">
                        ${isOverdue ? 'OVERDUE' : isDueSoon ? 'DUE SOON' : daysUntil > 0 ? `${daysUntil} days left` : 'COMPLETED'}
                    </span>
                </div>
            </div>
        `;
    }).join('');
}

// Form Handlers
function setupFormHandlers() {
    // Client Form
    const clientForm = document.getElementById('client-form');
    if (clientForm) {
        clientForm.addEventListener('submit', function(e) {
            e.preventDefault();
            try {
                const mode = this.dataset.mode;
                const clients = storage.get('clients');
                const clientData = {
                    id: mode === 'edit' ? this.dataset.clientId : undefined,
                    name: document.getElementById('client-name').value,
                    businessType: document.getElementById('client-business-type').value,
                    gstin: document.getElementById('client-gstin').value,
                    pan: document.getElementById('client-pan').value,
                    email: document.getElementById('client-email').value,
                    phone: document.getElementById('client-phone').value,
                    address: document.getElementById('client-address').value
                };

                if (!clientData.name.trim()) {
                    alert('Please enter client name');
                    return;
                }

                if (mode === 'edit' && clientData.id) {
                    // Try API update
                    api.put(`/api/clients/${clientData.id}`, clientData).then(res => {
                        if (res && res.success) {
                            storage.save('clients', (storage.get('clients').map(c => c.id === clientData.id ? res.client : c)));
                            closeModal('client-modal');
                            loadClients();
                            updateDashboard();
                        } else throw new Error('Update failed');
                    }).catch(() => {
                        const index = clients.findIndex(c => c.id === clientData.id);
                        if (index !== -1) clients[index] = Object.assign({}, clients[index], clientData);
                        storage.save('clients', clients);
                        closeModal('client-modal');
                        loadClients();
                        updateDashboard();
                    });
                } else {
                    // Create via API
                    api.post('/api/clients', clientData).then(res => {
                        if (res && res.success) {
                            const newClients = storage.get('clients').concat([res.client]);
                            storage.save('clients', newClients);
                            closeModal('client-modal');
                            loadClients();
                            updateDashboard();
                        } else throw new Error('Create failed');
                    }).catch(() => {
                        clientData.id = generateId();
                        clients.push(clientData);
                        storage.save('clients', clients);
                        closeModal('client-modal');
                        loadClients();
                        updateDashboard();
                    });
                }
            } catch (error) {
                console.error('Error saving client:', error);
                alert('Error saving client: ' + error.message);
            }
        });
    } else {
        console.warn('Client form not found');
    }
    
    // Transaction Form
    const transactionForm = document.getElementById('transaction-form');
    if (transactionForm) {
        transactionForm.addEventListener('submit', function(e) {
            e.preventDefault();
            try {
                const transactions = storage.get('transactions');
                const mode = this.dataset.mode;
                
                const transactionData = {
                    id: mode === 'edit' ? this.dataset.transactionId : generateId(),
                    date: document.getElementById('transaction-date').value,
                    clientId: document.getElementById('transaction-client').value,
                    type: document.getElementById('transaction-type').value,
                    category: document.getElementById('transaction-category').value,
                    description: document.getElementById('transaction-description').value,
                    amount: parseFloat(document.getElementById('transaction-amount').value),
                    paymentMethod: document.getElementById('transaction-payment-method').value,
                    reference: document.getElementById('transaction-reference').value
                };
                
                if (!transactionData.date) {
                    alert('Please select a date');
                    return;
                }
                if (!transactionData.clientId) {
                    alert('Please select a client');
                    return;
                }
                if (!transactionData.type) {
                    alert('Please select a transaction type');
                    return;
                }
                if (isNaN(transactionData.amount) || transactionData.amount <= 0) {
                    alert('Please enter a valid amount');
                    return;
                }
                
                if (mode === 'edit') {
                    // Try API update
                    api.put(`/api/transactions/${transactionData.id}`, transactionData).then(res => {
                        if (res && res.success) {
                            storage.save('transactions', (storage.get('transactions').map(t => t.id === transactionData.id ? res.transaction : t)));
                            closeModal('transaction-modal');
                            loadTransactions();
                            updateDashboard();
                        } else throw new Error('Update failed');
                    }).catch(() => {
                        const index = transactions.findIndex(t => t.id === transactionData.id);
                        if (index !== -1) transactions[index] = transactionData;
                        storage.save('transactions', transactions);
                        closeModal('transaction-modal');
                        loadTransactions();
                        updateDashboard();
                    });
                } else {
                    // Create via API
                    api.post('/api/transactions', transactionData).then(res => {
                        if (res && res.success) {
                            const newTransactions = storage.get('transactions').concat([res.transaction]);
                            storage.save('transactions', newTransactions);
                            closeModal('transaction-modal');
                            loadTransactions();
                            updateDashboard();
                        } else throw new Error('Create failed');
                    }).catch(() => {
                        transactionData.id = generateId();
                        transactions.push(transactionData);
                        storage.save('transactions', transactions);
                        closeModal('transaction-modal');
                        loadTransactions();
                        updateDashboard();
                    });
                }
            } catch (error) {
                console.error('Error saving transaction:', error);
                alert('Error saving transaction: ' + error.message);
            }
        });
    } else {
        console.warn('Transaction form not found');
    }
    
    // Invoice Form
    const invoiceForm = document.getElementById('invoice-form');
    if (invoiceForm) {
        invoiceForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const invoices = storage.get('invoices');
            
            const items = Array.from(document.querySelectorAll('.invoice-item')).map(item => {
                const qty = parseFloat(item.querySelector('.item-quantity').value || 0);
                const rate = parseFloat(item.querySelector('.item-rate').value || 0);
                const tax = parseFloat(item.querySelector('.item-tax').value || 0);
                const description = item.querySelector('.item-description').value;
                
                const subtotal = qty * rate;
                const taxAmount = subtotal * (tax / 100);
                
                return {
                    description,
                    quantity: qty,
                    rate,
                    tax,
                    subtotal,
                    taxAmount,
                    total: subtotal + taxAmount
                };
            }).filter(item => item.description && item.rate > 0);
            
            if (items.length === 0) {
                alert('Please add at least one invoice item');
                return;
            }
            
            const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
            const totalTax = items.reduce((sum, item) => sum + item.taxAmount, 0);
            const total = subtotal + totalTax;
            
            const invoiceData = {
                id: generateId(),
                number: document.getElementById('invoice-number').value,
                clientId: document.getElementById('invoice-client').value,
                date: document.getElementById('invoice-date').value,
                dueDate: document.getElementById('invoice-due-date').value,
                items,
                subtotal,
                tax: totalTax,
                total,
                status: 'pending'
            };
            
            invoices.push(invoiceData);
            storage.save('invoices', invoices);
            closeModal('invoice-modal');
            loadInvoices();
            updateDashboard();
        });
    }
}

// Utility Functions
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0
    }).format(amount);
}

function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function getClientName(clientId) {
    if (!clientId) return 'N/A';
    const client = storage.get('clients').find(c => c.id === clientId);
    return client ? client.name : 'Unknown';
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
}

function showSettings() {
    alert('Settings feature coming soon!');
}

function addNewClient() {
    showClientModal();
}

function addTransaction() {
    showTransactionModal();
}

function createInvoice() {
    showInvoiceModal();
}

function generateReport() {
    showSection('reports');
    const reportTypeSelect = document.getElementById('report-type');
    if (reportTypeSelect && !reportTypeSelect.value) {
        reportTypeSelect.value = 'pl';
    }
}

function getAIInsights() {
    showSection('ai-insights');
    refreshAIInsights();
}

function viewInvoice(invoiceId) {
    const invoice = storage.get('invoices').find(i => i.id === invoiceId);
    if (!invoice) return;
    
    const client = storage.get('clients').find(c => c.id === invoice.clientId);
    
    const invoiceHTML = `
        <div style="max-width: 800px; margin: 0 auto; background: white; padding: 2rem; border-radius: 12px;">
            <div style="text-align: center; margin-bottom: 2rem;">
                <h2>INVOICE</h2>
                <p>Invoice #${invoice.number}</p>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; margin-bottom: 2rem;">
                <div>
                    <h4>Bill To:</h4>
                    <p>${client?.name || 'N/A'}<br>
                    ${client?.address || ''}<br>
                    ${client?.email || ''}<br>
                    ${client?.phone || ''}</p>
                </div>
                <div style="text-align: right;">
                    <p><strong>Date:</strong> ${formatDate(invoice.date)}</p>
                    <p><strong>Due Date:</strong> ${formatDate(invoice.dueDate)}</p>
                    <p><strong>Status:</strong> ${invoice.status.toUpperCase()}</p>
                </div>
            </div>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 2rem;">
                <thead>
                    <tr style="background: var(--bg);">
                        <th style="padding: 0.75rem; text-align: left;">Description</th>
                        <th style="padding: 0.75rem; text-align: right;">Qty</th>
                        <th style="padding: 0.75rem; text-align: right;">Rate</th>
                        <th style="padding: 0.75rem; text-align: right;">Tax</th>
                        <th style="padding: 0.75rem; text-align: right;">Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${invoice.items.map(item => `
                        <tr>
                            <td style="padding: 0.75rem;">${item.description}</td>
                            <td style="padding: 0.75rem; text-align: right;">${item.quantity}</td>
                            <td style="padding: 0.75rem; text-align: right;">${formatCurrency(item.rate)}</td>
                            <td style="padding: 0.75rem; text-align: right;">${item.tax}%</td>
                            <td style="padding: 0.75rem; text-align: right;">${formatCurrency(item.total)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            <div style="text-align: right; margin-top: 2rem;">
                <p>Subtotal: ${formatCurrency(invoice.subtotal)}</p>
                <p>Tax: ${formatCurrency(invoice.tax)}</p>
                <h3 style="margin-top: 1rem; border-top: 2px solid var(--primary); padding-top: 1rem;">
                    Total: ${formatCurrency(invoice.total)}
                </h3>
            </div>
        </div>
    `;
    
    const newWindow = window.open('', '_blank');
    newWindow.document.write(`
        <html>
            <head>
                <title>Invoice ${invoice.number}</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 2rem; }
                    @media print { body { padding: 0; } }
                </style>
            </head>
            <body>${invoiceHTML}</body>
        </html>
    `);
    newWindow.document.close();
}

function previewInvoice() {
    // Get invoice items and calculate totals
    const items = Array.from(document.querySelectorAll('.invoice-item')).map(item => {
        const qty = parseFloat(item.querySelector('.item-quantity').value || 0);
        const rate = parseFloat(item.querySelector('.item-rate').value || 0);
        const tax = parseFloat(item.querySelector('.item-tax').value || 0);
        const description = item.querySelector('.item-description').value;
        
        const subtotal = qty * rate;
        const taxAmount = subtotal * (tax / 100);
        
        return {
            description,
            quantity: qty,
            rate,
            tax,
            subtotal,
            taxAmount,
            total: subtotal + taxAmount
        };
    }).filter(item => item.description && item.rate > 0);
    
    if (items.length === 0) {
        alert('Please add at least one invoice item');
        return;
    }
    
    const client = storage.get('clients').find(c => c.id === document.getElementById('invoice-client').value);
    const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
    const totalTax = items.reduce((sum, item) => sum + item.taxAmount, 0);
    const total = subtotal + totalTax;
    
    const invoiceHTML = `
        <div style="max-width: 800px; margin: 0 auto; background: white; padding: 2rem; border-radius: 12px;">
            <div style="text-align: center; margin-bottom: 2rem;">
                <h2>INVOICE PREVIEW</h2>
                <p>Invoice #${document.getElementById('invoice-number').value || 'NEW'}</p>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; margin-bottom: 2rem;">
                <div>
                    <h4>Bill To:</h4>
                    <p>${client?.name || 'N/A'}<br>
                    ${client?.address || ''}<br>
                    ${client?.email || ''}<br>
                    ${client?.phone || ''}</p>
                </div>
                <div style="text-align: right;">
                    <p><strong>Date:</strong> ${document.getElementById('invoice-date').value}</p>
                    <p><strong>Due Date:</strong> ${document.getElementById('invoice-due-date').value}</p>
                    <p><strong>Status:</strong> DRAFT</p>
                </div>
            </div>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 2rem;">
                <thead>
                    <tr style="background: #f3f4f6;">
                        <th style="padding: 0.75rem; text-align: left;">Description</th>
                        <th style="padding: 0.75rem; text-align: right;">Qty</th>
                        <th style="padding: 0.75rem; text-align: right;">Rate</th>
                        <th style="padding: 0.75rem; text-align: right;">Tax</th>
                        <th style="padding: 0.75rem; text-align: right;">Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${items.map(item => `
                        <tr>
                            <td style="padding: 0.75rem;">${item.description}</td>
                            <td style="padding: 0.75rem; text-align: right;">${item.quantity}</td>
                            <td style="padding: 0.75rem; text-align: right;">${formatCurrency(item.rate)}</td>
                            <td style="padding: 0.75rem; text-align: right;">${item.tax}%</td>
                            <td style="padding: 0.75rem; text-align: right;">${formatCurrency(item.total)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            <div style="text-align: right; margin-top: 2rem;">
                <p>Subtotal: <strong>${formatCurrency(subtotal)}</strong></p>
                <p>Tax: <strong>${formatCurrency(totalTax)}</strong></p>
                <h3 style="margin-top: 1rem; border-top: 2px solid #2563eb; padding-top: 1rem;">
                    Total: <strong>${formatCurrency(total)}</strong>
                </h3>
            </div>
        </div>
    `;
    
    const newWindow = window.open('', '_blank');
    newWindow.document.write(`
        <html>
            <head>
                <title>Invoice Preview - ${document.getElementById('invoice-number').value || 'NEW'}</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 2rem; background: #f8fafc; }
                    @media print { body { padding: 0; background: white; } }
                </style>
            </head>
            <body>${invoiceHTML}</body>
        </html>
    `);
    newWindow.document.close();
}

function exportReport() {
    const reportContainer = document.getElementById('report-container');
    if (!reportContainer || reportContainer.innerHTML.includes('placeholder')) {
        alert('Please generate a report first');
        return;
    }
    
    const reportType = document.getElementById('report-type').value;
    const dateFrom = document.getElementById('report-date-from').value;
    const dateTo = document.getElementById('report-date-to').value;
    const timestamp = new Date().toLocaleDateString('en-IN');
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html>
            <head>
                <title>Financial Report - ${reportType}</title>
                <style>
                    body { 
                        font-family: Arial, sans-serif; 
                        padding: 2rem; 
                        background: white;
                        color: #1e293b;
                    }
                    h1, h2, h3 { color: #2563eb; margin-top: 1.5rem; }
                    h1 { border-bottom: 2px solid #2563eb; padding-bottom: 1rem; }
                    table { 
                        width: 100%; 
                        border-collapse: collapse; 
                        margin: 1rem 0;
                    }
                    th, td { 
                        padding: 0.75rem; 
                        border: 1px solid #e2e8f0;
                        text-align: left;
                    }
                    th { 
                        background: #f3f4f6;
                        font-weight: bold;
                    }
                    tr:nth-child(even) { background: #f8fafc; }
                    .report-meta {
                        margin-bottom: 2rem;
                        padding: 1rem;
                        background: #f8fafc;
                        border-radius: 8px;
                        border-left: 4px solid #2563eb;
                    }
                    @media print { 
                        body { padding: 0; }
                        .report-meta { page-break-inside: avoid; }
                        table { page-break-inside: avoid; }
                    }
                </style>
            </head>
            <body>
                <div class="report-meta">
                    <h1>Financial Report</h1>
                    <p><strong>Report Type:</strong> ${document.getElementById('report-type').options[document.getElementById('report-type').selectedIndex].text}</p>
                    <p><strong>Period:</strong> ${dateFrom} to ${dateTo}</p>
                    <p><strong>Generated:</strong> ${timestamp}</p>
                </div>
                ${reportContainer.innerHTML}
            </body>
        </html>
    `);
    printWindow.document.close();
    printWindow.print();
}

// Close modals when clicking outside
window.onclick = function(event) {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });
}

// API layer (uses CAsense backend if available, falls back to localStorage)
const API_BASE = (function() {
    try {
        if (window.location.hostname) return `${window.location.protocol}//${window.location.hostname}:4000`;
    } catch (e) {}
    return 'http://localhost:4000';
})();

const api = {
    async get(path) {
        try {
            const res = await fetch(`${API_BASE}${path}`);
            if (!res.ok) throw new Error('Network error');
            return await res.json();
        } catch (err) {
            console.warn('API GET failed', path, err.message);
            throw err;
        }
    },
    async post(path, body) {
        const res = await fetch(`${API_BASE}${path}`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
        });
        return await res.json();
    },
    async put(path, body) {
        const res = await fetch(`${API_BASE}${path}`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
        });
        return await res.json();
    },
    async delete(path) {
        const res = await fetch(`${API_BASE}${path}`, { method: 'DELETE' });
        return await res.json();
    }
};