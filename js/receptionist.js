// Receptionist View - Daily Income and Expenses Form
document.addEventListener('DOMContentLoaded', async () => {
    // Require authentication
    const session = await window.auth.requireAuth();
    if (!session) return;

    // DOM Elements
    const form = document.getElementById('daily-record-form');
    const submitBtn = document.getElementById('submit-btn');
    const formView = document.getElementById('form-view');
    const successView = document.getElementById('success-view');
    const newRecordBtn = document.getElementById('new-record-btn');
    const dateDisplay = document.getElementById('current-date-display');

    // New Elements for Split Income
    const cashInput = document.getElementById('cash-income');
    const voucherInput = document.getElementById('voucher-income');
    const totalComputedDisplay = document.getElementById('total-computed-display');
    const cutDateInput = document.getElementById('cut-date');

    const expensesList = document.getElementById('expenses-list');
    const expensesSummary = document.getElementById('expenses-summary');
    const totalExpensesDisplay = document.getElementById('total-expenses');
    const expenseCategorySelect = document.getElementById('expense-category');
    const expenseDescriptionInput = document.getElementById('expense-description');
    const expenseAmountInput = document.getElementById('expense-amount');
    const addExpenseBtn = document.getElementById('add-expense-btn');

    // User initials
    const userInitialsEl = document.getElementById('user-initials');
    const user = await window.auth.getUser();
    if (user && userInitialsEl) {
        const name = user.user_metadata?.name || user.email?.split('@')[0] || 'U';
        userInitialsEl.textContent = name.substring(0, 2).toUpperCase();
    }

    // State
    let expenses = [];

    // Category labels
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

    // Format currency
    function formatCurrency(amount) {
        return new Intl.NumberFormat('es-MX', {
            style: 'currency',
            currency: 'MXN',
            minimumFractionDigits: 2
        }).format(amount);
    }

    // Update date display
    function updateDate() {
        if (!dateDisplay) return;
        const today = new Date();
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        let formattedDate = today.toLocaleDateString('es-ES', options);
        // Capitalize first letter
        formattedDate = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);
        dateDisplay.textContent = formattedDate;
    }

    if (dateDisplay) {
        updateDate();
        setInterval(updateDate, 60000);
    }

    // Set Default Date
    if (cutDateInput) {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        cutDateInput.value = `${yyyy}-${mm}-${dd}`;
    }

    // Auto-Calculate Total
    function updateTotalDisplay() {
        const cash = parseFloat(cashInput?.value) || 0;
        const voucher = parseFloat(voucherInput?.value) || 0;
        const total = cash + voucher;
        if (totalComputedDisplay) {
            totalComputedDisplay.textContent = formatCurrency(total);
        }
    }

    if (cashInput) cashInput.addEventListener('input', updateTotalDisplay);
    if (voucherInput) voucherInput.addEventListener('input', updateTotalDisplay);

    // Render expenses list
    function renderExpenses() {
        if (expenses.length === 0) {
            expensesList.innerHTML = `
                <p class="text-muted text-center" style="padding: var(--space-4);">
                    Sin gastos registrados
                </p>
            `;
            expensesSummary.classList.add('hidden');
            return;
        }

        expensesList.innerHTML = expenses.map((exp, index) => `
            <div class="expense-item" style="display: flex; justify-content: space-between; align-items: center; padding: var(--space-3); background: var(--bg-secondary); border-radius: var(--radius-md); margin-bottom: var(--space-2);">
                <div style="flex: 1;">
                    <div style="font-size: var(--font-size-sm); color: var(--text-secondary); margin-bottom: 2px;">
                        ${categoryLabels[exp.category] || exp.category}
                    </div>
                    <div style="color: var(--text-primary);">${escapeHtml(exp.description)}</div>
                </div>
                <div style="display: flex; align-items: center; gap: var(--space-3);">
                    <span style="font-weight: 600; color: var(--danger);">${formatCurrency(exp.amount)}</span>
                    <button type="button" class="btn btn-ghost" onclick="removeExpense(${index})" style="padding: 4px; color: var(--text-muted);" aria-label="Eliminar gasto">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
            </div>
        `).join('');

        // Calculate and show total
        const total = expenses.reduce((sum, exp) => sum + exp.amount, 0);
        totalExpensesDisplay.textContent = formatCurrency(total);
        expensesSummary.classList.remove('hidden');
    }

    // Remove expense helper (global)
    window.removeExpense = (index) => {
        expenses.splice(index, 1);
        renderExpenses();
    };

    // Escape HTML to prevent XSS
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Add expense handler
    if (addExpenseBtn) {
        addExpenseBtn.addEventListener('click', () => {
            const category = expenseCategorySelect.value;
            const description = expenseDescriptionInput.value.trim();
            const amount = parseFloat(expenseAmountInput.value);

            // Validation
            if (!category) {
                alert('Por favor selecciona una categoría.');
                expenseCategorySelect.focus();
                return;
            }

            if (!description) {
                alert('Por favor ingresa una descripción.');
                expenseDescriptionInput.focus();
                return;
            }

            if (!amount || amount <= 0) {
                alert('Por favor ingresa un monto válido.');
                expenseAmountInput.focus();
                return;
            }

            // Add to list (all receptionist expenses are 'efectivo')
            expenses.push({
                category,
                description,
                amount,
                payment_method: 'efectivo'
            });

            // Clear inputs
            expenseCategorySelect.value = '';
            expenseDescriptionInput.value = '';
            expenseAmountInput.value = '';

            // Re-render
            renderExpenses();
        });
    }

    // Form submission
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const cash = parseFloat(cashInput?.value) || 0;
        const voucher = parseFloat(voucherInput?.value) || 0;
        const totalIncome = cash + voucher;
        const selectedDate = cutDateInput?.value;

        // Validation
        if (!selectedDate) {
            alert('Por favor selecciona una fecha.');
            cutDateInput?.focus();
            return;
        }

        if (totalIncome < 0) {
            alert('El total no puede ser negativo.');
            return;
        }

        // Disable submit button
        submitBtn.disabled = true;
        submitBtn.innerHTML = `
            <div class="spinner" style="width: 20px; height: 20px; border-width: 2px;"></div>
            Guardando...
        `;

        try {
            const currentUser = await window.auth.getUser();
            const userName = currentUser.user_metadata?.name || currentUser.email?.split('@')[0] || 'Usuario';

            // Use selected date combined with current time for accurate record
            const now = new Date();
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');
            const seconds = String(now.getSeconds()).padStart(2, '0');
            const timestamp = `${selectedDate}T${hours}:${minutes}:${seconds}`;

            // 1. Insert blind cut record (income)
            const { error: incomeError } = await window.supabaseClient
                .from('blind_cuts')
                .insert({
                    user_id: currentUser.id,
                    user_name: userName,
                    total_counted: totalIncome,
                    cash_counted: cash,
                    voucher_counted: voucher,
                    valid_date: selectedDate,
                    created_at: timestamp,
                    adjustments: [],
                    status: 'pending'
                });

            if (incomeError) throw incomeError;

            // 2. Insert all expenses (associated with this cut date)
            if (expenses.length > 0) {
                const expenseRecords = expenses.map(exp => ({
                    user_id: currentUser.id,
                    user_name: userName,
                    category: exp.category,
                    payment_method: exp.payment_method,
                    description: exp.description,
                    amount: exp.amount,
                    created_at: timestamp,
                    valid_date: selectedDate
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

            // Reset Date to Today
            const today = new Date();
            const yyyy = today.getFullYear();
            const mm = String(today.getMonth() + 1).padStart(2, '0');
            const dd = String(today.getDate()).padStart(2, '0');
            if (cutDateInput) cutDateInput.value = `${yyyy}-${mm}-${dd}`;

            updateTotalDisplay();
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
