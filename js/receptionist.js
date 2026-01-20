// Receptionist View - Daily Income and Expenses Form
document.addEventListener('DOMContentLoaded', async () => {
    // Require authentication
    const session = await window.auth.requireAuth();
    if (!session) return;

    // DOM Elements
    const form = document.getElementById('daily-record-form');
    const totalIncomeInput = document.getElementById('total-income');
    const expensesList = document.getElementById('expenses-list');
    const expensesSummary = document.getElementById('expenses-summary');
    const totalExpensesDisplay = document.getElementById('total-expenses');

    // Expense form elements
    const categorySelect = document.getElementById('expense-category');
    const descriptionInput = document.getElementById('expense-description');
    const amountInput = document.getElementById('expense-amount');
    const addExpenseBtn = document.getElementById('add-expense-btn');

    const submitBtn = document.getElementById('submit-btn');
    const formView = document.getElementById('form-view');
    const successView = document.getElementById('success-view');
    const userInitials = document.getElementById('user-initials');
    const newRecordBtn = document.getElementById('new-record-btn');

    // State
    let expenses = [];

    // Category labels for display
    const categoryLabels = {
        'renta': '🏠 Renta',
        'material': '🦷 Material Dental',
        'insumos': '📦 Insumos',
        'nomina': '💼 Nómina',
        'comisiones': '💰 Comisiones',
        'servicios': '⚡ Servicios',
        'mantenimiento': '🔧 Mantenimiento',
        'otros': '📋 Otros'
    };

    const methodLabels = {
        'efectivo': '💵 Efectivo',
        'transferencia': '🏦 Transferencia',
        'tarjeta': '💳 Tarjeta'
    };

    // Initialize user info
    const user = await window.auth.getUser();
    if (user && userInitials) {
        const email = user.email || '';
        userInitials.textContent = email.substring(0, 2).toUpperCase();
    }

    // Format currency
    function formatCurrency(amount) {
        return new Intl.NumberFormat('es-MX', {
            style: 'currency',
            currency: 'MXN',
            minimumFractionDigits: 2
        }).format(amount);
    }

    // Calculate total expenses
    function calculateTotalExpenses() {
        return expenses.reduce((sum, exp) => sum + (parseFloat(exp.amount) || 0), 0);
    }

    // Render expenses list
    function renderExpenses() {
        expensesList.innerHTML = '';

        if (expenses.length === 0) {
            expensesList.innerHTML = `
                <p class="text-muted text-center" style="padding: var(--space-4);">
                    Sin gastos registrados
                </p>
            `;
            expensesSummary.classList.add('hidden');
            return;
        }

        expenses.forEach((exp, index) => {
            const item = document.createElement('div');
            item.className = 'expense-item';
            item.innerHTML = `
                <div class="expense-item-header">
                    <span class="expense-category">${categoryLabels[exp.category] || exp.category}</span>
                    <span class="expense-method">${methodLabels[exp.payment_method] || exp.payment_method}</span>
                </div>
                <div class="expense-item-body">
                    <span class="expense-description">${escapeHtml(exp.description)}</span>
                    <span class="expense-amount">${formatCurrency(exp.amount)}</span>
                    <button type="button" class="remove-btn" data-index="${index}" aria-label="Eliminar">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
            `;
            expensesList.appendChild(item);
        });

        // Update summary
        expensesSummary.classList.remove('hidden');
        totalExpensesDisplay.textContent = formatCurrency(calculateTotalExpenses());
    }

    // Escape HTML to prevent XSS
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Add expense handler
    addExpenseBtn.addEventListener('click', () => {
        const category = categorySelect.value;
        const description = descriptionInput.value.trim();
        const amount = parseFloat(amountInput.value);

        if (!category) {
            categorySelect.focus();
            return;
        }

        if (!description) {
            descriptionInput.focus();
            return;
        }

        if (isNaN(amount) || amount <= 0) {
            amountInput.focus();
            return;
        }

        expenses.push({
            category: category,
            payment_method: 'efectivo', // Receptionist can only use cash
            description: description,
            amount: amount
        });

        // Clear inputs
        categorySelect.value = '';
        descriptionInput.value = '';
        amountInput.value = '';
        categorySelect.focus();

        renderExpenses();
    });

    // Remove expense handler (event delegation)
    expensesList.addEventListener('click', (e) => {
        const removeBtn = e.target.closest('.remove-btn');
        if (removeBtn) {
            const index = parseInt(removeBtn.dataset.index, 10);
            expenses.splice(index, 1);
            renderExpenses();
        }
    });

    // Validate income input (prevent negative numbers)
    totalIncomeInput.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        if (value < 0) {
            e.target.value = 0;
        }
    });

    // Form submission
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const totalIncome = parseFloat(totalIncomeInput.value);

        // Validation
        if (isNaN(totalIncome) || totalIncome < 0) {
            totalIncomeInput.focus();
            return;
        }

        // Disable submit button
        submitBtn.disabled = true;
        submitBtn.innerHTML = `
            <div class="spinner" style="width: 20px; height: 20px; border-width: 2px;"></div>
            Guardando...
        `;

        try {
            const user = await window.auth.getUser();

            // 1. Insert blind cut record (income)
            const userName = user.user_metadata?.name || user.email?.split('@')[0] || 'Usuario';
            const { error: incomeError } = await window.supabaseClient
                .from('blind_cuts')
                .insert({
                    user_id: user.id,
                    user_name: userName,
                    total_counted: totalIncome,
                    adjustments: [],
                    status: 'pending'
                });

            if (incomeError) throw incomeError;

            // 2. Insert all expenses
            if (expenses.length > 0) {
                const expenseRecords = expenses.map(exp => ({
                    user_id: user.id,
                    user_name: userName,
                    category: exp.category,
                    payment_method: exp.payment_method,
                    description: exp.description,
                    amount: exp.amount
                }));

                const { error: expenseError } = await window.supabaseClient
                    .from('expenses')
                    .insert(expenseRecords);

                if (expenseError) throw expenseError;
            }

            // Show success view
            formView.classList.add('hidden');
            successView.classList.remove('hidden');

            // Reset form state
            expenses = [];
            form.reset();
            renderExpenses();

        } catch (error) {
            console.error('Error saving record:', error);
            alert('Error al guardar. Por favor intenta de nuevo.');

            // Re-enable button
            submitBtn.disabled = false;
            submitBtn.innerHTML = `
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                Terminar Turno
            `;
        }
    });

    // New record button
    if (newRecordBtn) {
        newRecordBtn.addEventListener('click', () => {
            successView.classList.add('hidden');
            formView.classList.remove('hidden');

            // Re-enable submit button
            submitBtn.disabled = false;
            submitBtn.innerHTML = `
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                Terminar Turno
            `;
        });
    }

    // Initial render
    renderExpenses();
});
