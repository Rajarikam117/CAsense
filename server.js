const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const DATA_FILE = path.join(__dirname, 'data.json');

function loadData() {
    try {
        const raw = fs.readFileSync(DATA_FILE, 'utf8');
        return JSON.parse(raw);
    } catch (err) {
        return { clients: [], transactions: [], invoices: [] };
    }
}

function saveData(data) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
}

// Serve static frontend files
app.use('/', express.static(path.join(__dirname)));

// Simple API
app.get('/api/health', (req, res) => {
    res.json({ success: true, service: 'CAsense backend', timestamp: new Date().toISOString() });
});

app.get('/api/clients', (req, res) => {
    const data = loadData();
    res.json({ success: true, clients: data.clients });
});

app.post('/api/clients', (req, res) => {
    const data = loadData();
    const client = req.body;
    client.id = Date.now().toString();
    data.clients.push(client);
    saveData(data);
    res.status(201).json({ success: true, client });
});

// Update client
app.put('/api/clients/:id', (req, res) => {
    const data = loadData();
    const id = req.params.id;
    const index = data.clients.findIndex(c => c.id === id);
    if (index === -1) return res.status(404).json({ success: false, message: 'Client not found' });
    const updated = Object.assign({}, data.clients[index], req.body);
    data.clients[index] = updated;
    saveData(data);
    res.json({ success: true, client: updated });
});

// Delete client
app.delete('/api/clients/:id', (req, res) => {
    const data = loadData();
    const id = req.params.id;
    const before = data.clients.length;
    data.clients = data.clients.filter(c => c.id !== id);
    if (data.clients.length === before) return res.status(404).json({ success: false, message: 'Client not found' });
    saveData(data);
    res.json({ success: true });
});

app.get('/api/transactions', (req, res) => {
    const data = loadData();
    res.json({ success: true, transactions: data.transactions });
});

app.post('/api/transactions', (req, res) => {
    const data = loadData();
    const tx = req.body;
    tx.id = Date.now().toString();
    tx.date = tx.date || new Date().toISOString();
    data.transactions.push(tx);
    saveData(data);
    res.status(201).json({ success: true, transaction: tx });
});

// Update transaction
app.put('/api/transactions/:id', (req, res) => {
    const data = loadData();
    const id = req.params.id;
    const index = data.transactions.findIndex(t => t.id === id);
    if (index === -1) return res.status(404).json({ success: false, message: 'Transaction not found' });
    const updated = Object.assign({}, data.transactions[index], req.body);
    data.transactions[index] = updated;
    saveData(data);
    res.json({ success: true, transaction: updated });
});

app.delete('/api/transactions/:id', (req, res) => {
    const data = loadData();
    const id = req.params.id;
    const before = data.transactions.length;
    data.transactions = data.transactions.filter(t => t.id !== id);
    if (data.transactions.length === before) return res.status(404).json({ success: false, message: 'Transaction not found' });
    saveData(data);
    res.json({ success: true });
});

app.get('/api/invoices', (req, res) => {
    const data = loadData();
    res.json({ success: true, invoices: data.invoices });
});

app.post('/api/invoices', (req, res) => {
    const data = loadData();
    const invoice = req.body;
    invoice.id = Date.now().toString();
    invoice.createdAt = new Date().toISOString();
    data.invoices.push(invoice);
    saveData(data);
    res.status(201).json({ success: true, invoice });
});

// Update invoice
app.put('/api/invoices/:id', (req, res) => {
    const data = loadData();
    const id = req.params.id;
    const index = data.invoices.findIndex(i => i.id === id);
    if (index === -1) return res.status(404).json({ success: false, message: 'Invoice not found' });
    const updated = Object.assign({}, data.invoices[index], req.body);
    data.invoices[index] = updated;
    saveData(data);
    res.json({ success: true, invoice: updated });
});

app.delete('/api/invoices/:id', (req, res) => {
    const data = loadData();
    const id = req.params.id;
    const before = data.invoices.length;
    data.invoices = data.invoices.filter(i => i.id !== id);
    if (data.invoices.length === before) return res.status(404).json({ success: false, message: 'Invoice not found' });
    saveData(data);
    res.json({ success: true });
});

app.get('/api/ai-insights', (req, res) => {
    const data = loadData();
    // Simple insights: totals by type
    const totalRevenue = data.transactions
        .filter(t => t.type === 'income')
        .reduce((s, t) => s + (Number(t.amount) || 0), 0);
    const totalExpenses = data.transactions
        .filter(t => t.type === 'expense')
        .reduce((s, t) => s + (Number(t.amount) || 0), 0);

    res.json({
        success: true,
        insights: {
            totalRevenue,
            totalExpenses,
            netProfit: totalRevenue - totalExpenses,
            activeClients: data.clients.length,
            invoiceCount: data.invoices.length
        }
    });
});

// fallback
app.use((req, res) => {
    res.status(404).json({ success: false, message: 'Not found' });
});

app.listen(PORT, () => {
    console.log(`CAsense backend running at http://localhost:${PORT}`);
});

module.exports = app;
