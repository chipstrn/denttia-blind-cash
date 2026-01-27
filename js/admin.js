// Toggle function for collapsible sections (global scope)
function toggleSection(sectionName) {
    const section = document.querySelector(`.collapsible-section[data-section="${sectionName}"]`);
    if (section) {
        section.classList.toggle('open');
    }
}

// Scroll to section and expand if needed
function scrollToSection(sectionName) {
    const section = document.querySelector(`.collapsible-section[data-section="${sectionName}"]`);
    if (section) {
        if (!section.classList.contains('open')) {
            section.classList.add('open');
        }
        // Smooth scroll with offset for sticky headers if any
        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

// Admin View - Audit Dashboard with Weekly Audit
document.addEventListener('DOMContentLoaded', async () => {
    // Require authentication and admin role
    const session = await window.auth.requireAuth();
    if (!session) return;

    // Check admin role
    const isAdmin = await window.auth.isAdmin();
    if (!isAdmin) {
        // Allow any authenticated user for demo
    }

    // ============ DOM Elements ============
    // Tabs
    const tabs = document.querySelectorAll('.tab');
    const tabContents = document.querySelectorAll('.tab-content');

    // Daily View Elements
    const cutsTableBody = document.getElementById('cuts-table-body');
    const loadingIndicator = document.getElementById('loading');
    const emptyState = document.getElementById('empty-state');
    const userInitials = document.getElementById('user-initials');
    const modalBackdrop = document.getElementById('modal-backdrop');
    const closeModalBtn = document.getElementById('close-modal');

    // Date filter elements
    const dateFromInput = document.getElementById('date-from');
    const dateToInput = document.getElementById('date-to');
    const filterBtn = document.getElementById('filter-btn');
    const clearFilterBtn = document.getElementById('clear-filter-btn');

    // Modal elements
    const modalDate = document.getElementById('modal-date');
    const modalUser = document.getElementById('modal-user');
    const modalTotalCounted = document.getElementById('modal-total-counted');
    const expectedCashInput = document.getElementById('expected-cash');
    const expectedVoucherInput = document.getElementById('expected-voucher');
    const differenceDisplay = document.getElementById('difference-display');
    const statusSelect = document.getElementById('status-select');
    const notesInput = document.getElementById('reviewer-notes');
    const saveReviewBtn = document.getElementById('save-review-btn');
    const deleteCutBtn = document.getElementById('delete-cut-btn');

    // Audit Date Filter Elements
    const auditDateFrom = document.getElementById('audit-date-from');
    const auditDateTo = document.getElementById('audit-date-to');
    const auditFilterBtn = document.getElementById('audit-filter-btn');
    const auditClearBtn = document.getElementById('audit-clear-btn');

    // Password Modal Elements
    const changePasswordBtn = document.getElementById('change-password-btn');
    const passwordModalBackdrop = document.getElementById('password-modal-backdrop');
    const closePasswordModalBtn = document.getElementById('close-password-modal');
    const changePasswordForm = document.getElementById('change-password-form');
    const newPasswordInput = document.getElementById('new-password');
    const confirmPasswordInput = document.getElementById('confirm-password');
    const passwordError = document.getElementById('password-error');
    const savePasswordBtn = document.getElementById('save-password-btn');

    // Weekly Audit Elements
    const weekSelect = document.getElementById('week-select');
    const weekIncome = document.getElementById('week-income');
    const weekExpenses = document.getElementById('week-expenses');
    const weekBalance = document.getElementById('week-balance');
    const categoryBreakdown = document.getElementById('category-breakdown');
    const methodBreakdown = document.getElementById('method-breakdown');
    const weekExpensesBody = document.getElementById('week-expenses-body');
    const weekExpensesLoading = document.getElementById('week-expenses-loading');

    // Admin Expense Form Elements
    const adminExpenseCategory = document.getElementById('admin-expense-category');
    const adminExpenseMethod = document.getElementById('admin-expense-method');
    const adminExpenseDescription = document.getElementById('admin-expense-description');
    const adminExpenseAmount = document.getElementById('admin-expense-amount');
    const adminAddExpenseBtn = document.getElementById('admin-add-expense-btn');
    const adminExpenseMessage = document.getElementById('admin-expense-message');

    // ============ State ============
    let cuts = [];
    let selectedCut = null;
    let discrepancyFilterType = 'global'; // 'global', 'cash', 'voucher' (Keeping for daily view compatibility if needed)
    let currentViewMode = 'global'; // 'global', 'cash', 'voucher' (New Global Filter)

    // Category and Method Labels
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

    // ============ Initialize ============
    const user = await window.auth.getUser();
    if (user && userInitials) {
        const email = user.email || '';
        userInitials.textContent = email.substring(0, 2).toUpperCase();
    }

    // ============ Helper Functions ============
    function getISOWeekAndYear(d) {
        d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
        d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        const week = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
        return { year: d.getUTCFullYear(), week: week };
    }

    function getWeekDates(weekStr) {
        const [year, week] = weekStr.split('-W').map(Number);
        const simple = new Date(year, 0, 1 + (week - 1) * 7);
        const dow = simple.getDay();
        const startDate = new Date(simple);
        if (dow <= 4) startDate.setDate(simple.getDate() - simple.getDay() + 1);
        else startDate.setDate(simple.getDate() + 8 - simple.getDay());
        const endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
        return {
            start: startDate.toISOString().split('T')[0],
            end: endDate.toISOString().split('T')[0],
            startDate: startDate,
            endDate: endDate
        };
    }

    function formatWeekLabel(weekStr) {
        const { startDate, endDate } = getWeekDates(weekStr);
        const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        const startDay = startDate.getDate();
        const endDay = endDate.getDate();
        const startMonth = months[startDate.getMonth()];
        const endMonth = months[endDate.getMonth()];

        if (startMonth === endMonth) {
            return `${startDay} - ${endDay} ${endMonth}`;
        } else {
            return `${startDay} ${startMonth} - ${endDay} ${endMonth}`;
        }
    }

    // Populate week dropdown with last 12 weeks
    function populateWeekSelector() {
        weekSelect.innerHTML = '';
        const today = new Date();

        for (let i = 0; i < 12; i++) {
            const d = new Date(today);
            d.setDate(d.getDate() - (i * 7));
            const { year, week } = getISOWeekAndYear(d);
            const weekStr = `${year}-W${week.toString().padStart(2, '0')}`;
            const label = formatWeekLabel(weekStr);

            const option = document.createElement('option');
            option.value = weekStr;
            option.textContent = i === 0 ? `📌 Esta semana (${label})` : label;
            weekSelect.appendChild(option);
        }
    }

    populateWeekSelector();

    function formatCurrency(amount) {
        if (amount === null || amount === undefined) return '—';
        return new Intl.NumberFormat('es-MX', {
            style: 'currency',
            currency: 'MXN',
            minimumFractionDigits: 2
        }).format(amount);
    }

    function formatDate(dateStr) {
        const date = new Date(dateStr);
        return new Intl.DateTimeFormat('es-MX', {
            dateStyle: 'medium',
            timeStyle: 'short'
        }).format(date);
    }

    function formatDateShort(dateStr) {
        const date = new Date(dateStr);
        return new Intl.DateTimeFormat('es-MX', {
            dateStyle: 'short'
        }).format(date);
    }

    function calculateAdjustmentsTotal(adjustments) {
        if (!Array.isArray(adjustments)) return 0;
        return adjustments.reduce((sum, adj) => sum + (parseFloat(adj.amount) || 0), 0);
    }

    function calculateDifference(totalCounted, adjustments, expected) {
        if (expected === null || expected === undefined) {
            return { difference: null, class: '', label: 'Sin calcular' };
        }
        const adjustmentsTotal = calculateAdjustmentsTotal(adjustments);
        const total = parseFloat(totalCounted) + adjustmentsTotal;
        const diff = total - parseFloat(expected);

        if (Math.abs(diff) < 0.01) {
            return { difference: 0, class: 'traffic-light-green', label: 'Cuadra' };
        } else if (diff < 0) {
            return { difference: diff, class: 'traffic-light-red', label: 'Faltante' };
        } else {
            return { difference: diff, class: 'traffic-light-yellow', label: 'Sobrante' };
        }
    }

    function renderStatusBadge(status) {
        const statusMap = {
            pending: { class: 'badge-pending', label: 'Pendiente' },
            reviewed: { class: 'badge-reviewed', label: 'Revisado' },
            disputed: { class: 'badge-disputed', label: 'Disputado' }
        };
        const config = statusMap[status] || statusMap.pending;
        return `<span class="badge ${config.class}">${config.label}</span>`;
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // ============ Tab Handling ============
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            tab.classList.add('active');
            const tabId = tab.dataset.tab + '-tab';
            document.getElementById(tabId).classList.add('active');
        });
    });

    // ============ Daily View Functions ============
    function renderTableRow(cut) {
        // Calculate expected and difference using split amounts
        const cashCounted = parseFloat(cut.cash_counted) || 0;
        const voucherCounted = parseFloat(cut.voucher_counted) || 0;
        const totalCounted = parseFloat(cut.total_counted) || 0;

        const expensesTotal = cut.expensesTotal || 0;
        const expensesCash = cut.expensesCash || 0;
        const expensesVoucher = cut.expensesVoucher || 0;

        const expectedCash = cut.expected_cash !== null ? parseFloat(cut.expected_cash) : null;
        const expectedVoucher = cut.expected_voucher !== null ? parseFloat(cut.expected_voucher) : null;

        // Calculate differences based on filter type
        let displayCounted = 0;
        let displayExpenses = 0;
        let displayExpected = null;
        let displayDiff = null;

        if (discrepancyFilterType === 'cash') {
            // Cash only
            displayCounted = cashCounted;
            displayExpenses = expensesCash;
            if (expectedCash !== null) {
                displayExpected = expectedCash;
                // Cash Diff = (CashCounted + CashExpenses) - ExpectedCash
                // Note: If non-cash expenses were paid, they normally don't affect Cash Drawer.
                // Assumption: Expenses recorded as "Efectivo" come from the drawer.
                displayDiff = (cashCounted + expensesCash) - expectedCash;
            }
        } else if (discrepancyFilterType === 'voucher') {
            // Voucher only
            displayCounted = voucherCounted;
            displayExpenses = expensesVoucher; // Typically 0 or irrelevant for balancing
            if (expectedVoucher !== null) {
                displayExpected = expectedVoucher;
                displayDiff = voucherCounted - expectedVoucher;
            }
        } else {
            // Global (both)
            displayCounted = totalCounted;
            displayExpenses = expensesTotal;
            if (expectedCash !== null || expectedVoucher !== null) {
                displayExpected = (expectedCash || 0) + (expectedVoucher || 0);

                const cashDiff = expectedCash !== null ? (cashCounted + expensesCash) - expectedCash : 0;
                const voucherDiff = expectedVoucher !== null ? voucherCounted - expectedVoucher : 0;
                displayDiff = cashDiff + voucherDiff;
            }
        }

        const diffClass = displayDiff === null ? '' : displayDiff === 0 ? 'exact' : (displayDiff > 0 ? 'over' : 'under');
        const filterLabel = discrepancyFilterType === 'cash' ? '💵' : discrepancyFilterType === 'voucher' ? '💳' : '';

        return `
        <tr data-id="${cut.id}">
            <td data-label="Fecha">${formatDate(cut.created_at)}</td>
            <td data-label="Usuario">${cut.user_name || 'Usuario'}</td>
            <td data-label="Contado" class="text-right number-formatted">${filterLabel} ${formatCurrency(displayCounted)}</td>
            <td data-label="Gastos" class="text-right number-formatted">${formatCurrency(displayExpenses)}</td>
            <td data-label="Esperado" class="text-right number-formatted">${displayExpected !== null ? filterLabel + ' ' + formatCurrency(displayExpected) : '<span class="text-muted">—</span>'}</td>
            <td data-label="Diferencia" class="text-right number-formatted">
                ${displayDiff !== null ? `
                    <span class="traffic-light ${diffClass}">
                        <span class="traffic-light-icon"></span>
                        ${displayDiff >= 0 ? '+' : ''}${formatCurrency(displayDiff)}
                    </span>
                ` : '<span class="text-muted">—</span>'}
            </td>
            <td data-label="Estado">${renderStatusBadge(cut.status)}</td>
        </tr>
    `;
    }
    // ============ UI Helper Functions ============
    function renderDailyTable() {
        const cutsTableBody = document.getElementById('cuts-table-body');
        const emptyState = document.getElementById('empty-state');

        if (!cuts || cuts.length === 0) {
            if (cutsTableBody) cutsTableBody.innerHTML = '';
            if (emptyState) emptyState.classList.remove('hidden');
            return;
        }

        if (emptyState) emptyState.classList.add('hidden');
        if (cutsTableBody) {
            cutsTableBody.innerHTML = cuts.map(renderTableRow).join('');
        }
    }

    // ============ Data Loading Functions ============
    async function loadCuts(dateFrom = null, dateTo = null) {
        loadingIndicator.classList.remove('hidden');
        emptyState.classList.add('hidden');
        cutsTableBody.innerHTML = '';

        try {
            // Fetch cuts
            let cutsQuery = window.supabaseClient
                .from('blind_cuts')
                .select('*')
                .order('created_at', { ascending: false });

            if (dateFrom) cutsQuery = cutsQuery.gte('valid_date', dateFrom);
            if (dateTo) cutsQuery = cutsQuery.lte('valid_date', dateTo);

            // Fetch expenses to map them
            let expensesQuery = window.supabaseClient
                .from('expenses')
                .select('*');

            if (dateFrom) expensesQuery = expensesQuery.gte('valid_date', dateFrom);
            if (dateTo) expensesQuery = expensesQuery.lte('valid_date', dateTo);

            const [cutsResult, expensesResult] = await Promise.all([cutsQuery, expensesQuery]);

            if (cutsResult.error) throw cutsResult.error;
            if (expensesResult.error) throw expensesResult.error;

            const fetchedCuts = cutsResult.data || [];
            const expenses = expensesResult.data || [];

            // Map expenses to cuts by valid_date
            cuts = fetchedCuts.map(cut => {
                const cutDate = cut.valid_date;
                const cutExpenses = expenses.filter(e => e.valid_date === cutDate && !e.is_global);
                const expensesTotal = cutExpenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
                const expensesCash = cutExpenses.filter(e => e.payment_method === 'efectivo').reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
                const expensesVoucher = cutExpenses.filter(e => e.payment_method !== 'efectivo').reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);

                return { ...cut, expensesTotal, expensesCash, expensesVoucher };
            });

            renderDailyTable();

        } catch (error) {
            console.error('Error loading cuts:', error);
            cutsTableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center text-danger">
                        Error al cargar datos. Por favor recarga la página.
                    </td>
                </tr>
            `;
        } finally {
            loadingIndicator.classList.add('hidden');
        }
    }

    async function openModal(cut) {
        selectedCut = cut;
        modalDate.textContent = formatDate(cut.created_at);
        modalUser.textContent = cut.user_name || 'Usuario';
        modalTotalCounted.textContent = formatCurrency(cut.total_counted);

        // Update breakdown
        const modalCashCounted = document.getElementById('modal-cash-counted');
        const modalVoucherCounted = document.getElementById('modal-voucher-counted');
        if (modalCashCounted) modalCashCounted.textContent = formatCurrency(cut.cash_counted || 0);
        if (modalVoucherCounted) modalVoucherCounted.textContent = formatCurrency(cut.voucher_counted || 0);

        // Populate split expected inputs
        expectedCashInput.value = cut.expected_cash || '';
        expectedVoucherInput.value = cut.expected_voucher || '';
        statusSelect.value = cut.status || 'pending';
        notesInput.value = cut.reviewer_notes || '';
        updateDifferenceDisplay();

        // Get modal expense elements
        const modalExpensesList = document.getElementById('modal-expenses-list');
        const modalExpensesTotal = document.getElementById('modal-expenses-total');
        const modalTotalExpenses = document.getElementById('modal-total-expenses');
        const modalExpenseDate = document.getElementById('modal-expense-date');

        // Set the cut date for expense display and insertion
        // Prefer valid_date (business date) over created_at (timestamp)
        const cutDateStr = cut.valid_date || cut.created_at.split('T')[0];

        if (modalExpenseDate) {
            modalExpenseDate.textContent = formatDate(cut.created_at);
        }

        // Store date for adding expenses (store on window temporarily)
        window.currentCutDate = cutDateStr;

        const dayStart = cutDateStr + 'T00:00:00';
        const dayEnd = cutDateStr + 'T23:59:59';

        try {
            const { data: expenses, error } = await window.supabaseClient
                .from('expenses')
                .select('*')
                .eq('valid_date', cutDateStr)
                .order('created_at', { ascending: true });

            if (error) throw error;

            if (expenses && expenses.length > 0) {
                // Render expenses with user name
                modalExpensesList.innerHTML = expenses.map(exp => `
                    <div class="expense-item" style="padding: var(--space-3); border-radius: var(--radius-md); background: var(--bg-secondary); margin-bottom: var(--space-2);">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-1);">
                            <span style="font-size: var(--font-size-sm); color: var(--text-secondary);">👤 ${exp.user_name || 'Usuario'}</span>
                            <span class="expense-amount" style="font-weight: 600; color: ${exp.is_global ? 'var(--text-muted)' : 'var(--text-primary)'};">${formatCurrency(exp.amount)}</span>
                        </div>
                        <div style="display: flex; gap: var(--space-2); flex-wrap: wrap; margin-bottom: var(--space-1);">
                            <span style="font-size: var(--font-size-xs); padding: 2px 6px; border-radius: var(--radius-sm); background: var(--bg-tertiary);">${categoryLabels[exp.category] || exp.category}</span>
                            <span style="font-size: var(--font-size-xs); padding: 2px 6px; border-radius: var(--radius-sm); background: ${exp.payment_method === 'efectivo' ? 'var(--success-light)' : exp.payment_method === 'transferencia' ? 'var(--info-light)' : 'var(--warning-light)'}; color: ${exp.payment_method === 'efectivo' ? 'var(--success)' : exp.payment_method === 'transferencia' ? 'var(--info)' : 'var(--warning)'};">${methodLabels[exp.payment_method] || exp.payment_method}</span>
                            ${exp.is_global ? '<span style="font-size: var(--font-size-xs); padding: 2px 6px; border-radius: var(--radius-sm); background: var(--primary-light); color: var(--primary);">Global (No suma)</span>' : ''}
                        </div>
                        <div style="font-size: var(--font-size-sm); color: var(--text-muted);">${escapeHtml(exp.description)}</div>
                    </div>
                `).join('');

                // Calculate and show total (excluding global expenses)
                const total = expenses.reduce((sum, exp) => sum + (exp.is_global ? 0 : parseFloat(exp.amount)), 0);
                modalTotalExpenses.textContent = formatCurrency(total);
                modalExpensesTotal.classList.remove('hidden');

                // Store for difference calculation
                selectedCut.currentExpensesTotal = total;
            } else {
                modalExpensesList.innerHTML = '<p class="text-muted text-center">Sin gastos registrados este día</p>';
                modalExpensesTotal.classList.add('hidden');
                selectedCut.currentExpensesTotal = 0;
            }
            // Update difference with new expense total
            updateDifferenceDisplay();

        } catch (error) {
            console.error('Error fetching expenses:', error);
            modalExpensesList.innerHTML = '<p class="text-muted text-center">Error al cargar gastos</p>';
            modalExpensesTotal.classList.add('hidden');
        }

        // Show the modal
        modalBackdrop.classList.add('active');
    }

    function closeModal() {
        modalBackdrop.classList.remove('active');
        selectedCut = null;
    }

    // Refresh only the expenses list in the modal (preserves admin inputs)
    async function refreshModalExpenses() {
        if (!window.currentCutDate) return;

        const modalExpensesList = document.getElementById('modal-expenses-list');
        const modalExpensesTotal = document.getElementById('modal-expenses-total');
        const modalTotalExpenses = document.getElementById('modal-total-expenses');

        if (!modalExpensesList) return;

        // Use valid_date filtering logic, same as openModal
        const cutDateStr = window.currentCutDate;

        try {
            const { data: expenses, error } = await window.supabaseClient
                .from('expenses')
                .select('*')
                .eq('valid_date', cutDateStr) // Consistent filtering
                .order('created_at', { ascending: true });

            if (error) throw error;

            if (expenses && expenses.length > 0) {
                modalExpensesList.innerHTML = expenses.map(exp => `
                    <div class="expense-item" style="padding: var(--space-3); border-radius: var(--radius-md); background: var(--bg-secondary); margin-bottom: var(--space-2);">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-1);">
                            <span style="font-size: var(--font-size-sm); color: var(--text-secondary);">👤 ${exp.user_name || 'Usuario'}</span>
                            <span class="expense-amount" style="font-weight: 600; color: ${exp.is_global ? 'var(--text-muted)' : 'var(--text-primary)'};">${formatCurrency(exp.amount)}</span>
                        </div>
                        <div style="display: flex; gap: var(--space-2); flex-wrap: wrap; margin-bottom: var(--space-1);">
                            <span style="font-size: var(--font-size-xs); padding: 2px 6px; border-radius: var(--radius-sm); background: var(--bg-tertiary);">${categoryLabels[exp.category] || exp.category}</span>
                            <span style="font-size: var(--font-size-xs); padding: 2px 6px; border-radius: var(--radius-sm); background: ${exp.payment_method === 'efectivo' ? 'var(--success-light)' : exp.payment_method === 'transferencia' ? 'var(--info-light)' : 'var(--warning-light)'}; color: ${exp.payment_method === 'efectivo' ? 'var(--success)' : exp.payment_method === 'transferencia' ? 'var(--info)' : 'var(--warning)'};">${methodLabels[exp.payment_method] || exp.payment_method}</span>
                            ${exp.is_global ? '<span style="font-size: var(--font-size-xs); padding: 2px 6px; border-radius: var(--radius-sm); background: var(--primary-light); color: var(--primary);">Global (No suma)</span>' : ''}
                        </div>
                        <div style="font-size: var(--font-size-sm); color: var(--text-muted);">${escapeHtml(exp.description)}</div>
                    </div>
                `).join('');

                const total = expenses.reduce((sum, exp) => sum + (exp.is_global ? 0 : parseFloat(exp.amount)), 0);
                if (modalTotalExpenses) modalTotalExpenses.textContent = formatCurrency(total);
                if (modalExpensesTotal) modalExpensesTotal.classList.remove('hidden');

                // Update total in selectedCut and refresh difference
                if (selectedCut) {
                    selectedCut.currentExpensesTotal = total;
                    updateDifferenceDisplay();
                }
            } else {
                modalExpensesList.innerHTML = '<p class="text-muted text-center">Sin gastos registrados este día</p>';
                if (modalExpensesTotal) modalExpensesTotal.classList.add('hidden');
                if (selectedCut) {
                    selectedCut.currentExpensesTotal = 0;
                    updateDifferenceDisplay();
                }
            }
        } catch (error) {
            console.error('Error refreshing expenses:', error);
        }
    }

    function updateDifferenceDisplay() {
        if (!selectedCut) return;

        const expectedCash = parseFloat(expectedCashInput.value);
        const expectedVoucher = parseFloat(expectedVoucherInput.value);
        const cashCounted = parseFloat(selectedCut.cash_counted) || 0;
        const voucherCounted = parseFloat(selectedCut.voucher_counted) || 0;
        const expensesTotal = selectedCut.currentExpensesTotal || 0;

        // Check if at least one expected value is entered
        const hasCashExpected = !isNaN(expectedCash);
        const hasVoucherExpected = !isNaN(expectedVoucher);

        if (!hasCashExpected && !hasVoucherExpected) {
            differenceDisplay.innerHTML = '<span class="text-muted">Ingresa los montos esperados</span>';
            return;
        }

        let html = '';
        let totalDiff = 0;

        // Cash difference: (Cash + Expenses) - Expected
        if (hasCashExpected) {
            const cashDiff = (cashCounted + expensesTotal) - expectedCash;
            totalDiff += cashDiff;
            const cashClass = cashDiff === 0 ? 'exact' : (cashDiff > 0 ? 'over' : 'under');
            const cashLabel = cashDiff === 0 ? 'Exacto' : (cashDiff > 0 ? 'Sobrante' : 'Faltante');
            html += `
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="color: var(--text-secondary);">💵 Efectivo:</span>
                    <div style="text-align: right;">
                        <div style="font-size: 0.8rem; color: var(--text-muted);">(${formatCurrency(cashCounted)} + ${formatCurrency(expensesTotal)} gastos)</div>
                        <span class="traffic-light ${cashClass}" style="font-size: 0.9rem;">
                            <span class="traffic-light-icon"></span>
                            ${cashLabel}: ${formatCurrency(Math.abs(cashDiff))}
                        </span>
                    </div>
                </div>
            `;
        }

        // Voucher difference
        if (hasVoucherExpected) {
            const voucherDiff = voucherCounted - expectedVoucher;
            totalDiff += voucherDiff;
            const voucherClass = voucherDiff === 0 ? 'exact' : (voucherDiff > 0 ? 'over' : 'under');
            const voucherLabel = voucherDiff === 0 ? 'Exacto' : (voucherDiff > 0 ? 'Sobrante' : 'Faltante');
            html += `
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="color: var(--text-secondary);">💳 Vouchers:</span>
                    <span class="traffic-light ${voucherClass}" style="font-size: 0.9rem;">
                        <span class="traffic-light-icon"></span>
                        ${voucherLabel}: ${formatCurrency(Math.abs(voucherDiff))}
                    </span>
                </div>
            `;
        }

        // Total difference (if both are entered)
        if (hasCashExpected && hasVoucherExpected) {
            const totalClass = totalDiff === 0 ? 'exact' : (totalDiff > 0 ? 'over' : 'under');
            const totalLabel = totalDiff === 0 ? 'Exacto' : (totalDiff > 0 ? 'Sobrante' : 'Faltante');
            html += `
                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: var(--space-2); padding-top: var(--space-2); border-top: 1px solid var(--border-light);">
                    <span style="font-weight: 600;">📊 Total:</span>
                    <span class="traffic-light ${totalClass}">
                        <span class="traffic-light-icon"></span>
                        ${totalLabel}: ${formatCurrency(Math.abs(totalDiff))}
                    </span>
                </div>
            `;
        }

        differenceDisplay.innerHTML = html;
    }

    async function saveReview() {
        if (!selectedCut) return;

        const expectedCash = parseFloat(expectedCashInput.value);
        const expectedVoucher = parseFloat(expectedVoucherInput.value);
        const status = statusSelect.value;
        const notes = notesInput.value.trim();

        saveReviewBtn.disabled = true;
        saveReviewBtn.innerHTML = '<div class="spinner" style="width: 20px; height: 20px; border-width: 2px;"></div> Guardando...';

        try {
            const { error } = await window.supabaseClient
                .from('blind_cuts')
                .update({
                    expected_cash: isNaN(expectedCash) ? null : expectedCash,
                    expected_voucher: isNaN(expectedVoucher) ? null : expectedVoucher,
                    status: status,
                    reviewer_notes: notes || null,
                    reviewed_at: new Date().toISOString()
                })
                .eq('id', selectedCut.id);

            if (error) throw error;

            await refreshActiveViews();
            closeModal();

            // Alert success
            const successMsg = document.createElement('div');
            successMsg.textContent = '✅ Cambios guardados';
            successMsg.style.cssText = 'position: fixed; top: 20px; right: 20px; background: var(--success); color: white; padding: 12px 24px; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); z-index: 9999; animation: slideIn 0.3s ease-out;';
            document.body.appendChild(successMsg);
            setTimeout(() => successMsg.remove(), 3000);

        } catch (error) {
            console.error('Error saving review:', error);
            alert('Error al guardar. Por favor intenta de nuevo.');
        } finally {
            saveReviewBtn.disabled = false;
            saveReviewBtn.textContent = 'Guardar Cambios';
        }
    }

    // Helper to refresh all views respecting current filters
    async function refreshActiveViews() {
        // 1. Refresh Daily View
        await loadCuts(dateFromInput.value || null, dateToInput.value || null);

        // 2. Refresh Weekly Audit
        const customStart = auditDateFrom?.value;
        const customEnd = auditDateTo?.value;

        if (customStart && customEnd) {
            // Respect custom date filter if active
            await loadWeeklyAuditCustom(customStart, customEnd);
        } else {
            // Otherwise use the week selector
            await loadWeeklyAudit();
        }

        // Always refresh total cash
        await loadTotalCash();
    }


    // ============ Weekly Audit Functions ============
    async function loadWeeklyAudit() {
        const weekValue = weekSelect.value;
        if (!weekValue) return;
        const { start, end } = getWeekDates(weekValue);
        await loadWeeklyAuditCore(start, end);
    }

    async function loadWeeklyAuditCustom(start, end) {
        await loadWeeklyAuditCore(start, end);
    }

    // ============ Total Cash Module ============
    function initCashMonthSelector() {
        const selector = document.getElementById('cash-month-select');
        if (!selector) return;

        const now = new Date();
        const options = [];

        // Generate last 12 months
        for (let i = 0; i < 12; i++) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const value = d.toISOString().slice(0, 7); // YYYY-MM
            const label = d.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
            // Capitalize first letter
            const labelCap = label.charAt(0).toUpperCase() + label.slice(1);
            options.push(`<option value="${value}">${labelCap}</option>`);
        }

        selector.innerHTML = options.join('');

        // Listen for changes
        selector.addEventListener('change', () => {
            loadTotalCash();
        });
    }

    async function loadTotalCash() {
        const totalCashDisplay = document.getElementById('total-cash-display');
        const selector = document.getElementById('cash-month-select');
        if (!totalCashDisplay) return;

        try {
            // Determine Range
            let start, end;

            if (selector && selector.value) {
                // Use selected month
                const [year, month] = selector.value.split('-').map(Number);
                // Construct UTC dates to avoid timezone shift including next day's data
                // Month 1-12 from selector. Date.UTC wants 0-11.
                start = new Date(Date.UTC(year, month - 1, 1)).toISOString();
                end = new Date(Date.UTC(year, month, 0, 23, 59, 59)).toISOString();
            } else {
                // Default to current month
                const now = new Date();
                start = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1)).toISOString();
                end = new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)).toISOString();
            }

            // 1. Get Cash Income for Period
            const { data: cuts, error: cutsError } = await window.supabaseClient
                .from('blind_cuts')
                .select('cash_counted')
                .gte('valid_date', start)
                .lte('valid_date', end);

            if (cutsError) throw cutsError;

            const totalIncomeCash = (cuts || []).reduce((sum, cut) => sum + parseFloat(cut.cash_counted || 0), 0);

            // 2. Get Cash Expenses for Period (Efectivo OR Global)
            const { data: expenses, error: expensesError } = await window.supabaseClient
                .from('expenses')
                .select('amount, payment_method, is_global')
                .gte('valid_date', start)
                .lte('valid_date', end)
                .or('payment_method.eq.efectivo,is_global.eq.true');

            if (expensesError) throw expensesError;

            const totalExpensesCash = (expenses || []).reduce((sum, exp) => sum + parseFloat(exp.amount || 0), 0);

            // Net Cash = Cash In - Cash Out
            const totalCash = totalIncomeCash - totalExpensesCash;

            // Format
            totalCashDisplay.textContent = formatCurrency(totalCash);
            totalCashDisplay.style.color = totalCash >= 0 ? 'var(--text-primary)' : 'var(--danger)';

        } catch (error) {
            console.error('Error loading total cash:', error);
            totalCashDisplay.textContent = 'Error';
            totalCashDisplay.style.fontSize = '1rem';
            totalCashDisplay.style.color = 'var(--danger)';
        }
    }

    async function loadWeeklyAuditCore(start, end) {
        weekExpensesLoading?.classList.remove('hidden');

        try {
            // Load income (blind_cuts) with all fields for differences
            const { data: incomeData, error: incomeError } = await window.supabaseClient
                .from('blind_cuts')
                .select('*')
                .gte('valid_date', start)
                .lte('valid_date', end)
                .order('valid_date', { ascending: true });

            if (incomeError) throw incomeError;

            const cuts = incomeData || [];

            // ============ 1. Calculate Totals based on View Mode ============
            const totalIncome = cuts.reduce((sum, cut) => {
                let val = 0;
                if (currentViewMode === 'global') val = parseFloat(cut.total_counted || 0);
                else if (currentViewMode === 'cash') val = parseFloat(cut.cash_counted || 0);
                else if (currentViewMode === 'voucher') val = parseFloat(cut.voucher_counted || 0);
                return sum + val;
            }, 0);

            // First load expenses for the entire period to be efficient
            const { data: expenseData, error: expenseError } = await window.supabaseClient
                .from('expenses')
                .select('*')
                .gte('valid_date', start)
                .lte('valid_date', end)
                .order('valid_date', { ascending: true });

            if (expenseError) throw expenseError;
            let expenses = expenseData || [];

            // Filter expenses list globally if needed (for total calculation)
            // Note: We might still want to see all expenses in the detailed list, 
            // but for the Summary Cards and Table "Gastos" column, we must filter.
            const filteredExpensesGlobal = expenses.filter(exp => {
                if (currentViewMode === 'global') return true;
                if (currentViewMode === 'cash') return exp.payment_method === 'efectivo';
                if (currentViewMode === 'voucher') return exp.payment_method !== 'efectivo'; // tarjeta or transferencia
                return true;
            });

            const totalExpensesAmount = filteredExpensesGlobal.reduce((sum, exp) => sum + parseFloat(exp.amount || 0), 0);


            // Calculate total differences (using split expected amounts + expenses)
            let totalDifference = 0;

            cuts.forEach(cut => {
                // Find expenses for this cut (match valid_date)
                // Filter these expenses by mode too for the row calculation
                // EXCLUDE global expenses from daily row calculations
                const cutExpensesAll = expenses.filter(e => e.valid_date === cut.valid_date && !e.is_global);

                const cutExpensesFiltered = cutExpensesAll.filter(exp => {
                    if (currentViewMode === 'global') return true;
                    if (currentViewMode === 'cash') return exp.payment_method === 'efectivo';
                    if (currentViewMode === 'voucher') return exp.payment_method !== 'efectivo';
                    return true;
                });

                const cutExpensesTotal = cutExpensesFiltered.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
                cut.expensesTotal = cutExpensesTotal; // Store for table render

                const cashCounted = parseFloat(cut.cash_counted || 0);
                const voucherCounted = parseFloat(cut.voucher_counted || 0);
                const expectedCash = cut.expected_cash !== null ? parseFloat(cut.expected_cash) : null;
                const expectedVoucher = cut.expected_voucher !== null ? parseFloat(cut.expected_voucher) : null;

                // ============ DIFFERENCE CALCULATION FIX (SUMMARY) ============
                // Strictly separate Cash vs Voucher expenses for reconciliation.
                // Cash Counted + Cash Expenses (paid from drawer) = Expected Cash
                // Voucher Counted - Expected Voucher = Voucher Diff

                const cashExpenses = cutExpensesAll.filter(e => e.payment_method === 'efectivo').reduce((s, e) => s + parseFloat(e.amount || 0), 0);

                let cashDiff = 0;
                let voucherDiff = 0;
                let diff = null;

                if (expectedCash !== null) {
                    cashDiff = (cashCounted + cashExpenses) - expectedCash;
                }

                if (expectedVoucher !== null) {
                    voucherDiff = voucherCounted - expectedVoucher;
                }

                // Aggregate for Total Difference based on Mode
                if (currentViewMode === 'global') {
                    if (expectedCash !== null || expectedVoucher !== null) {
                        totalDifference += cashDiff + voucherDiff;
                    }
                } else if (currentViewMode === 'cash') {
                    if (expectedCash !== null) {
                        totalDifference += cashDiff;
                    }
                } else if (currentViewMode === 'voucher') {
                    if (expectedVoucher !== null) {
                        totalDifference += voucherDiff;
                    }
                }
            });

            // Update summary cards
            // Re-fetch elements to ensure we have the latest DOM references
            const weekIncomeEl = document.getElementById('week-income');
            const weekExpensesEl = document.getElementById('week-expenses');
            const weekBalanceEl = document.getElementById('week-balance');

            if (weekIncomeEl) weekIncomeEl.textContent = formatCurrency(totalIncome);
            if (weekExpensesEl) weekExpensesEl.textContent = formatCurrency(totalExpensesAmount);
            if (weekBalanceEl) weekBalanceEl.textContent = formatCurrency(totalIncome - totalExpensesAmount);

            // Update differences card
            const weekDifferences = document.getElementById('week-differences');
            if (weekDifferences) {
                weekDifferences.textContent = formatCurrency(Math.abs(totalDifference));
                weekDifferences.style.color = totalDifference === 0 ? 'var(--success)' : totalDifference < 0 ? 'var(--danger)' : 'var(--warning)';
            }

            // Render income table with differences (clickable rows)
            const weekIncomeBody = document.getElementById('week-income-body');
            // Store cuts for click handler
            window.weekCuts = cuts;

            if (weekIncomeBody) {
                if (cuts.length > 0) {
                    weekIncomeBody.innerHTML = cuts.map((cut, index) => {
                        // Prepare values for this row based on View Mode
                        let displayCounted = 0;
                        let displayExpenses = 0;
                        let displayExpected = null;
                        let displayDiff = null;

                        const cashCounted = parseFloat(cut.cash_counted || 0);
                        const voucherCounted = parseFloat(cut.voucher_counted || 0);
                        const expectedCash = cut.expected_cash !== null ? parseFloat(cut.expected_cash) : null;
                        const expectedVoucher = cut.expected_voucher !== null ? parseFloat(cut.expected_voucher) : null;

                        // Get expenses for this day
                        const cutExpensesAll = expenses.filter(e => e.valid_date === cut.valid_date && !e.is_global);

                        // Calculate specific expenses subsets
                        const cashExpenses = cutExpensesAll.filter(e => e.payment_method === 'efectivo').reduce((s, e) => s + e.amount, 0);
                        const nonCashExpenses = cutExpensesAll.filter(e => e.payment_method !== 'efectivo').reduce((s, e) => s + e.amount, 0);

                        if (currentViewMode === 'global') {
                            displayCounted = cashCounted + voucherCounted;
                            displayExpenses = cashExpenses + nonCashExpenses;

                            // Expected
                            if (expectedCash !== null || expectedVoucher !== null) {
                                displayExpected = (expectedCash || 0) + (expectedVoucher || 0);

                                // Diff
                                const cashDiff = expectedCash !== null ? (cashCounted + cashExpenses) - expectedCash : 0;
                                const voucherDiff = expectedVoucher !== null ? voucherCounted - expectedVoucher : 0;
                                displayDiff = cashDiff + voucherDiff;
                            }
                        } else if (currentViewMode === 'cash') {
                            displayCounted = cashCounted;
                            displayExpenses = cashExpenses;
                            if (expectedCash !== null) {
                                displayExpected = expectedCash;
                                displayDiff = (cashCounted + cashExpenses) - expectedCash;
                            }
                        } else if (currentViewMode === 'voucher') {
                            displayCounted = voucherCounted;
                            displayExpenses = nonCashExpenses; // Should we show non-cash expenses here? Yes, if "Voucher" implies "Bank/Digital".
                            if (expectedVoucher !== null) {
                                displayExpected = expectedVoucher;
                                displayDiff = voucherCounted - expectedVoucher;
                            }
                        }

                        // Override stored expensesTotal for the UI click handler sake? 
                        // Actually renderTableRow uses cut.expensesTotal. 
                        cut.expensesTotal = displayExpenses; // Update locally for consistency if needed, though render logic is separate here.

                        const diffClass = displayDiff === null ? '' : displayDiff === 0 ? 'text-success' : displayDiff < 0 ? 'text-danger' : 'text-warning';
                        const statusBadge = renderStatusBadge(cut.status);

                        return `
                            <tr class="clickable-row" data-cut-index="${index}" title="Clic para ver detalles">
                                <td data-label="Fecha">${formatDateShort(cut.created_at)}</td>
                                <td data-label="Usuario">${cut.user_name || 'Usuario'}</td>
                                <td data-label="Contado" class="text-right number-formatted" style="font-weight: 600;">${formatCurrency(displayCounted)}</td>
                                <td data-label="Gastos" class="text-right number-formatted">${formatCurrency(displayExpenses)}</td>
                                <td data-label="Esperado" class="text-right number-formatted">${displayExpected !== null ? formatCurrency(displayExpected) : '<span class="text-muted">—</span>'}</td>
                                <td data-label="Diferencia" class="text-right ${diffClass} number-formatted" style="font-weight: 600;">${displayDiff !== null ? (displayDiff >= 0 ? '+' : '') + formatCurrency(displayDiff) : '<span class="text-muted">—</span>'}</td>
                                <td data-label="Estado">${statusBadge}</td>
                            </tr>
                        `;
                    }).join('');
                } else {
                    weekIncomeBody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">Sin ingresos este periodo</td></tr>';
                }
            }

            // Category breakdown
            const byCategory = {};
            expenses.forEach(exp => {
                byCategory[exp.category] = (byCategory[exp.category] || 0) + parseFloat(exp.amount);
            });

            if (Object.keys(byCategory).length > 0) {
                categoryBreakdown.innerHTML = Object.entries(byCategory)
                    .sort((a, b) => b[1] - a[1])
                    .map(([cat, total]) => `
                        <div class="category-item card-hover" title="${categoryLabels[cat] || cat}: ${formatCurrency(total)}">
                            <div class="category-icon-wrapper">
                                <span class="category-name">${categoryLabels[cat] || cat}</span>
                            </div>
                            <span class="category-total number-formatted">${formatCurrency(total)}</span>
                        </div>
                    `).join('');
            } else {
                categoryBreakdown.innerHTML = '<p class="text-muted">Sin gastos esta semana</p>';
            }

            // Method breakdown
            const byMethod = {};
            expenses.forEach(exp => {
                byMethod[exp.payment_method] = (byMethod[exp.payment_method] || 0) + parseFloat(exp.amount);
            });

            if (Object.keys(byMethod).length > 0) {
                methodBreakdown.innerHTML = Object.entries(byMethod)
                    .sort((a, b) => b[1] - a[1])
                    .map(([method, total]) => `
                        <div class="category-item">
                            <span class="category-name">${methodLabels[method] || method}</span>
                            <span class="category-total">${formatCurrency(total)}</span>
                        </div>
                    `).join('');
            } else {
                methodBreakdown.innerHTML = '<p class="text-muted">Sin gastos esta semana</p>';
            }

            // Expenses table with user column
            if (expenses.length > 0) {
                // Store expenses for easy access
                window.weekExpenses = expenses;

                weekExpensesBody.innerHTML = expenses.map((exp, index) => `
                    <tr data-user="${exp.user_name || 'unknown'}" data-expense-index="${index}" class="clickable-row" title="Clic para editar">
                        <td data-label="Fecha">${formatDateShort(exp.created_at)}</td>
                        <td data-label="Usuario" style="font-size: var(--font-size-sm);">${exp.user_name || 'Usuario'}</td>
                        <td data-label="Categoría">
                            ${categoryLabels[exp.category] || exp.category}
                            ${exp.is_global ? '<span style="font-size: 0.75em; background: var(--primary-light); color: var(--primary); padding: 2px 6px; border-radius: 4px; margin-left: 6px;">Global</span>' : ''}
                        </td>
                        <td data-label="Método"><span style="padding: 2px 6px; border-radius: var(--radius-sm); font-size: var(--font-size-xs); background: ${exp.payment_method === 'efectivo' ? 'var(--success-light)' : exp.payment_method === 'transferencia' ? 'var(--info-light)' : 'var(--warning-light)'}; color: ${exp.payment_method === 'efectivo' ? 'var(--success)' : exp.payment_method === 'transferencia' ? 'var(--info)' : 'var(--warning)'};">${methodLabels[exp.payment_method] || exp.payment_method}</span></td>
                        <td data-label="Descripción">${escapeHtml(exp.description)}</td>
                        <td data-label="Monto" class="text-right" style="font-weight: 600;">
                            ${formatCurrency(exp.amount)}
                            <span style="font-size: 1rem; margin-left: 4px; opacity: 0.5;">✏️</span>
                        </td>
                    </tr>
                `).join('');
            } else {
                weekExpensesBody.innerHTML = `
                    <tr>
                        <td colspan="6" class="text-center text-muted">Sin gastos esta semana</td>
                    </tr>
                `;
            }

            // ============ POPULATE USER FILTER ============
            const userFilter = document.getElementById('expense-user-filter');
            if (userFilter) {
                // Get unique users
                const uniqueUsers = [...new Set(expenses.map(exp => exp.user_name).filter(Boolean))].sort();

                // Save current selection if exists
                const currentVal = userFilter.value;

                // Build options: Default "All" + users
                userFilter.innerHTML = '<option value="all">Todos los usuarios</option>' +
                    uniqueUsers.map(user => `<option value="${user}">${user}</option>`).join('');

                // Restore selection if still valid, otherwise default to "all"
                if (uniqueUsers.includes(currentVal)) {
                    userFilter.value = currentVal;
                } else {
                    userFilter.value = 'all';
                }

                // Remove existing listener to avoid duplicates if re-rendering (simple way)
                const newFilter = userFilter.cloneNode(true);
                userFilter.parentNode.replaceChild(newFilter, userFilter);

                // Add Change Listener
                newFilter.addEventListener('change', (e) => {
                    const selectedUser = e.target.value;
                    const rows = weekExpensesBody.querySelectorAll('tr[data-user]');

                    rows.forEach(row => {
                        if (selectedUser === 'all' || row.getAttribute('data-user') === selectedUser) {
                            row.style.display = '';
                        } else {
                            row.style.display = 'none';
                        }
                    });
                });

                // Add click stop propagation again to be safe (after clone)
                newFilter.addEventListener('click', (e) => e.stopPropagation());
            }

        } catch (error) {
            console.error('Error loading weekly audit:', error);
            alert('Error al cargar auditoría semanal.');
        } finally {
            weekExpensesLoading?.classList.add('hidden');
        }
    }

    // ============ Edit Expense Modal Logic ============
    const editExpenseModalBackdrop = document.getElementById('edit-expense-modal-backdrop');
    const closeEditExpenseModalBtn = document.getElementById('close-edit-expense-modal');
    const saveExpenseChangesBtn = document.getElementById('save-expense-changes-btn');
    const deleteExpenseBtn = document.getElementById('delete-expense-btn');

    // Inputs
    const editExpenseId = document.getElementById('edit-expense-id');
    const editExpenseCategory = document.getElementById('edit-expense-category');
    const editExpenseMethod = document.getElementById('edit-expense-method');
    const editExpenseDescription = document.getElementById('edit-expense-description');
    const editExpenseAmount = document.getElementById('edit-expense-amount');
    const editExpenseGlobal = document.getElementById('edit-expense-global');

    function openEditExpenseModal(expense) {
        if (!editExpenseModalBackdrop) return;

        // Fill form
        editExpenseId.value = expense.id;
        editExpenseCategory.value = expense.category;
        editExpenseMethod.value = expense.payment_method;
        editExpenseDescription.value = expense.description;
        editExpenseAmount.value = expense.amount;
        if (editExpenseGlobal) editExpenseGlobal.checked = expense.is_global || false;

        editExpenseModalBackdrop.classList.add('active');
    }

    function closeEditExpenseModal() {
        if (editExpenseModalBackdrop) editExpenseModalBackdrop.classList.remove('active');
    }

    if (closeEditExpenseModalBtn) {
        closeEditExpenseModalBtn.addEventListener('click', closeEditExpenseModal);
    }

    if (editExpenseModalBackdrop) {
        editExpenseModalBackdrop.addEventListener('click', (e) => {
            if (e.target === editExpenseModalBackdrop) closeEditExpenseModal();
        });
    }

    // Save Changes
    if (saveExpenseChangesBtn) {
        saveExpenseChangesBtn.addEventListener('click', async () => {
            const id = editExpenseId.value;
            const category = editExpenseCategory.value;
            const method = editExpenseMethod.value;
            const description = editExpenseDescription.value.trim();
            const amount = parseFloat(editExpenseAmount.value);
            const isGlobal = editExpenseGlobal ? editExpenseGlobal.checked : false;

            if (!description || isNaN(amount) || amount <= 0) {
                alert('Por favor completa todos los campos correctamente.');
                return;
            }

            saveExpenseChangesBtn.disabled = true;
            saveExpenseChangesBtn.textContent = 'Guardando...';

            try {
                const { error } = await window.supabaseClient
                    .from('expenses')
                    .update({
                        category: category,
                        payment_method: method,
                        description: description,
                        amount: amount,
                        is_global: isGlobal
                    })
                    .eq('id', id);

                if (error) throw error;

                // Success
                closeEditExpenseModal();
                await loadWeeklyAudit(); // Refresh data

            } catch (error) {
                console.error('Error updating expense:', error);
                alert('Error al actualizar el gasto.');
            } finally {
                saveExpenseChangesBtn.disabled = false;
                saveExpenseChangesBtn.textContent = 'Guardar Cambios';
            }
        });
    }

    // Delete Expense
    if (deleteExpenseBtn) {
        deleteExpenseBtn.addEventListener('click', async () => {
            const id = editExpenseId.value;
            if (!id) return;

            if (!confirm('¿Estás seguro de que deseas eliminar este gasto?')) return;

            deleteExpenseBtn.disabled = true;
            deleteExpenseBtn.textContent = 'Eliminando...';

            try {
                const { error } = await window.supabaseClient
                    .from('expenses')
                    .delete()
                    .eq('id', id);

                if (error) throw error;

                // Success
                closeEditExpenseModal();
                await loadWeeklyAudit(); // Refresh data

            } catch (error) {
                console.error('Error deleting expense:', error);
                alert('Error al eliminar el gasto.');
            } finally {
                deleteExpenseBtn.disabled = false;
                deleteExpenseBtn.textContent = 'Eliminar';
            }
        });
    }


    // ============ Event Listeners ============
    cutsTableBody.addEventListener('click', (e) => {
        const row = e.target.closest('tr[data-id]');
        if (row) {
            const cutId = row.dataset.id;
            const cut = cuts.find(c => c.id === cutId);
            if (cut) openModal(cut);
        }
    });

    // Listener for Weekly Income Table (New)
    const weekIncomeBody = document.getElementById('week-income-body');
    if (weekIncomeBody) {
        weekIncomeBody.addEventListener('click', (e) => {
            const row = e.target.closest('tr[data-cut-index]');
            if (row) {
                const index = parseInt(row.dataset.cutIndex);
                // Safe access to cut data
                if (window.weekCuts && window.weekCuts[index]) {
                    openModal(window.weekCuts[index]);
                }
            }
        });
    }

    // Single click listener for expenses (Mobile Optimized)
    if (weekExpensesBody) {
        weekExpensesBody.addEventListener('click', (e) => {
            const row = e.target.closest('tr[data-expense-index]');
            if (row) {
                const index = parseInt(row.dataset.expenseIndex);
                if (window.weekExpenses && window.weekExpenses[index]) {
                    openEditExpenseModal(window.weekExpenses[index]);
                }
            }
        });
    }

    closeModalBtn.addEventListener('click', closeModal);
    modalBackdrop.addEventListener('click', (e) => {
        if (e.target === modalBackdrop) closeModal();
    });
    expectedCashInput.addEventListener('input', updateDifferenceDisplay);
    expectedVoucherInput.addEventListener('input', updateDifferenceDisplay);
    saveReviewBtn.addEventListener('click', saveReview);

    // Audit Date Filter
    if (auditFilterBtn) {
        auditFilterBtn.addEventListener('click', () => {
            const from = auditDateFrom?.value;
            const to = auditDateTo?.value;

            // If both dates are empty, tell user to select week or enter dates
            if (!from && !to) {
                alert('Selecciona una semana rápida arriba, o ingresa un rango de fechas personalizado.');
                return;
            }

            // If only one date is entered
            if (!from || !to) {
                alert('Por favor selecciona ambas fechas (Desde y Hasta)');
                return;
            }

            // Clear week selector when using custom dates
            if (weekSelect) weekSelect.value = '';
            loadWeeklyAuditCustom(from, to);
        });
    }

    // Audit Clear Button (matches Daily View "Limpiar")
    if (auditClearBtn) {
        auditClearBtn.addEventListener('click', () => {
            // Clear date inputs
            if (auditDateFrom) auditDateFrom.value = '';
            if (auditDateTo) auditDateTo.value = '';

            // Reset to current week (first option)
            if (weekSelect && weekSelect.options.length > 0) {
                weekSelect.selectedIndex = 0;
            }

            // Reload with current week
            loadWeeklyAudit();
        });
    }

    if (deleteCutBtn) {
        deleteCutBtn.addEventListener('click', async () => {
            if (!selectedCut) return;

            if (!confirm('¿Estás seguro de que quieres ELIMINAR este corte Permanentemente? Esta acción no se puede deshacer.')) {
                return;
            }

            deleteCutBtn.disabled = true;
            deleteCutBtn.textContent = 'Eliminando...';

            try {
                // Delete from Supabase
                const { error } = await window.supabaseClient
                    .from('blind_cuts')
                    .delete()
                    .eq('id', selectedCut.id);

                if (error) throw error;

                // Close modal first
                closeModal();

                // Refresh all views respecting filters
                await refreshActiveViews();

                alert('Corte eliminado correctamente.');

            } catch (error) {
                console.error('Error deleting cut:', error);
                alert('Error al eliminar el corte.');
            } finally {
                deleteCutBtn.disabled = false;
                deleteCutBtn.textContent = 'Eliminar Corte';
            }
        });
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modalBackdrop.classList.contains('active')) {
            closeModal();
        }
    });

    filterBtn.addEventListener('click', () => {
        loadCuts(dateFromInput.value || null, dateToInput.value || null);
    });

    clearFilterBtn.addEventListener('click', () => {
        // Clear inputs
        dateFromInput.value = '';
        dateToInput.value = '';

        // Reset Selector if exists
        const selector = document.getElementById('daily-week-select');
        if (selector) selector.value = '';

        // Clear table and show empty state
        cutsTableBody.innerHTML = '';
        emptyState.classList.remove('hidden');
        renderPagination(0, 1); // Reset pagination if implemented
    });

    // Auto-load when week selection changes
    weekSelect.addEventListener('change', () => {
        // Clear custom date inputs when using week selector
        if (auditDateFrom) auditDateFrom.value = '';
        if (auditDateTo) auditDateTo.value = '';
        loadWeeklyAudit();
    });

    // Load current week and total cash on init
    loadWeeklyAudit();
    initCashMonthSelector(); // Init selector first
    loadTotalCash();

    // ============ Discrepancy Filter Buttons ============
    function setDiscrepancyFilter(type, view) {
        discrepancyFilterType = type;

        // Update button states for daily view
        const dailyBtns = {
            global: document.getElementById('daily-diff-global'),
            cash: document.getElementById('daily-diff-cash'),
            voucher: document.getElementById('daily-diff-voucher')
        };

        // Update button states for weekly view
        const weeklyBtns = {
            global: document.getElementById('weekly-diff-global'),
            cash: document.getElementById('weekly-diff-cash'),
            voucher: document.getElementById('weekly-diff-voucher')
        };

        // Update all buttons
        ['global', 'cash', 'voucher'].forEach(t => {
            if (dailyBtns[t]) {
                dailyBtns[t].classList.toggle('btn-primary', t === type);
                dailyBtns[t].classList.toggle('btn-secondary', t !== type);
            }
            if (weeklyBtns[t]) {
                weeklyBtns[t].classList.toggle('btn-primary', t === type);
                weeklyBtns[t].classList.toggle('btn-secondary', t !== type);
            }
        });

        // Instant refresh for daily view (no fetch)
        if (view === 'daily' || !view) {
            renderDailyTable();
        }

        // For weekly view, if we are indeed using these buttons for weekly context (unlikely now given view-mode-* buttons),
        // we might want to refresh weekly too. But safely.
        if (view === 'weekly') {
            loadWeeklyAudit();
        }
    }

    // Daily view filter buttons
    document.getElementById('daily-diff-global')?.addEventListener('click', () => setDiscrepancyFilter('global', 'daily'));
    document.getElementById('daily-diff-cash')?.addEventListener('click', () => setDiscrepancyFilter('cash', 'daily'));
    document.getElementById('daily-diff-voucher')?.addEventListener('click', () => setDiscrepancyFilter('voucher', 'daily'));

    // Weekly view filter buttons
    document.getElementById('weekly-diff-global')?.addEventListener('click', () => setDiscrepancyFilter('global', 'weekly'));
    document.getElementById('weekly-diff-cash')?.addEventListener('click', () => setDiscrepancyFilter('cash', 'weekly'));
    document.getElementById('weekly-diff-voucher')?.addEventListener('click', () => setDiscrepancyFilter('voucher', 'weekly'));

    // ============ Global View Filter Listeners (New) ============
    function setGlobalViewMode(mode) {
        currentViewMode = mode;

        // Update button visual states
        const btns = {
            global: document.getElementById('view-mode-global'),
            cash: document.getElementById('view-mode-cash'),
            voucher: document.getElementById('view-mode-voucher')
        };

        ['global', 'cash', 'voucher'].forEach(m => {
            if (btns[m]) {
                btns[m].classList.toggle('btn-primary', m === mode);
                btns[m].classList.toggle('btn-secondary', m !== mode);
            }
        });

        // Trigger reload of weekly audit to apply filter (respecting custom dates)
        refreshActiveViews();
    }

    document.getElementById('view-mode-global')?.addEventListener('click', () => setGlobalViewMode('global'));
    document.getElementById('view-mode-cash')?.addEventListener('click', () => setGlobalViewMode('cash'));
    document.getElementById('view-mode-voucher')?.addEventListener('click', () => setGlobalViewMode('voucher'));

    // Password Change Handlers
    function openPasswordModal() {
        passwordModalBackdrop.classList.add('active');
        changePasswordForm.reset();
        passwordError.classList.add('hidden');
    }

    function closePasswordModal() {
        passwordModalBackdrop.classList.remove('active');
    }

    if (changePasswordBtn) {
        changePasswordBtn.addEventListener('click', openPasswordModal);
    }

    if (closePasswordModalBtn) {
        closePasswordModalBtn.addEventListener('click', closePasswordModal);
    }

    if (passwordModalBackdrop) {
        passwordModalBackdrop.addEventListener('click', (e) => {
            if (e.target === passwordModalBackdrop) closePasswordModal();
        });
    }

    if (changePasswordForm) {
        changePasswordForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            passwordError.classList.add('hidden');

            const newPassword = newPasswordInput.value;
            const confirmPassword = confirmPasswordInput.value;

            if (newPassword !== confirmPassword) {
                passwordError.textContent = 'Las contraseñas no coinciden';
                passwordError.classList.remove('hidden');
                return;
            }

            if (newPassword.length < 6) {
                passwordError.textContent = 'La contraseña debe tener al menos 6 caracteres';
                passwordError.classList.remove('hidden');
                return;
            }

            savePasswordBtn.disabled = true;
            savePasswordBtn.innerHTML = '<div class="spinner" style="width: 20px; height: 20px; border-width: 2px;"></div> Actualizando...';

            try {
                const { error } = await window.supabaseClient.auth.updateUser({
                    password: newPassword
                });

                if (error) throw error;

                alert('¡Contraseña actualizada correctamente!');
                closePasswordModal();
            } catch (error) {
                console.error('Error updating password:', error);
                passwordError.textContent = error.message || 'Error al actualizar contraseña';
                passwordError.classList.remove('hidden');
            } finally {
                savePasswordBtn.disabled = false;
                savePasswordBtn.textContent = 'Actualizar Contraseña';
            }
        });
    }

    // Admin Add Expense Handler
    if (adminAddExpenseBtn) {
        adminAddExpenseBtn.addEventListener('click', async () => {
            const dateInput = document.getElementById('admin-expense-date');

            // Validate Date
            if (!dateInput || !dateInput.value) {
                alert('Por favor selecciona la fecha del corte.');
                dateInput?.focus();
                return;
            }

            const category = adminExpenseCategory?.value;
            const method = adminExpenseMethod?.value || 'efectivo';
            const description = adminExpenseDescription?.value?.trim();
            const amount = parseFloat(adminExpenseAmount?.value);
            const isGlobal = document.getElementById('admin-expense-global')?.checked || false;

            if (!category) {
                adminExpenseCategory?.focus();
                return;
            }

            if (!description) {
                adminExpenseDescription?.focus();
                return;
            }

            if (isNaN(amount) || amount <= 0) {
                adminExpenseAmount?.focus();
                return;
            }

            adminAddExpenseBtn.disabled = true;
            adminAddExpenseBtn.innerHTML = '<div class="spinner" style="width: 20px; height: 20px; border-width: 2px;"></div>';

            try {
                const user = await window.auth.getUser();
                const userName = user.user_metadata?.name || user.email?.split('@')[0] || 'Admin';

                // Use the explicit date selected by the admin
                const selectedDateStr = dateInput.value;
                // Add 12:00 PM to ensure it falls within the day in any timezone calculation
                const expenseDate = new Date(selectedDateStr + 'T12:00:00');

                // Insert into Supabase
                const { error } = await window.supabaseClient
                    .from('expenses')
                    .insert({
                        created_at: expenseDate.toISOString(),
                        valid_date: selectedDateStr, // Store business date directly
                        user_id: user.id,
                        user_name: userName,
                        category: category,
                        description: description,
                        amount: amount,
                        category: category,
                        description: description,
                        amount: amount,
                        payment_method: method,
                        is_global: isGlobal
                    });

                if (error) throw error;

                // Show success message
                if (adminExpenseMessage) {
                    adminExpenseMessage.textContent = '✅ Gasto guardado correctamente';
                    adminExpenseMessage.classList.remove('hidden');
                    setTimeout(() => adminExpenseMessage.classList.add('hidden'), 3000);
                }

                // Clear form
                adminExpenseCategory.value = '';
                adminExpenseDescription.value = '';
                adminExpenseAmount.value = '';
                const isGlobalInput = document.getElementById('admin-expense-global');
                if (isGlobalInput) isGlobalInput.checked = false;

                // Reload All Views (respecting filters)
                await refreshActiveViews();

            } catch (error) {
                console.error('Error saving expense:', error);
                if (adminExpenseMessage) {
                    adminExpenseMessage.textContent = '❌ Error al guardar gasto';
                    adminExpenseMessage.classList.remove('hidden');
                    adminExpenseMessage.classList.remove('text-success');
                    adminExpenseMessage.classList.add('text-danger');
                }
            } finally {
                adminAddExpenseBtn.disabled = false;
                adminAddExpenseBtn.innerHTML = `
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                    Guardar Gasto
                `;
            }
        });
    }

    // Modal Add Expense Handler (adds expense with cut date)
    const modalAddExpenseBtn = document.getElementById('modal-add-expense-btn');
    if (modalAddExpenseBtn) {
        modalAddExpenseBtn.addEventListener('click', async () => {
            const category = document.getElementById('modal-add-category')?.value;
            const method = document.getElementById('modal-add-method')?.value || 'efectivo';
            const description = document.getElementById('modal-add-description').value.trim();
            const amount = parseFloat(document.getElementById('modal-add-amount').value);
            const isGlobal = document.getElementById('modal-add-global')?.checked || false;
            const msgEl = document.getElementById('modal-add-expense-msg');

            if (!category || !description || isNaN(amount) || amount <= 0) {
                if (msgEl) {
                    msgEl.textContent = '⚠️ Completa todos los campos';
                    msgEl.classList.remove('hidden', 'text-success');
                    msgEl.classList.add('text-danger');
                }
                return;
            }

            modalAddExpenseBtn.disabled = true;
            modalAddExpenseBtn.textContent = '...';

            try {
                const user = await window.auth.getUser();
                const userName = user.user_metadata?.name || user.email?.split('@')[0] || 'Admin';

                // Create expense with the cut's date (not today)
                const expenseDate = window.currentCutDate + 'T12:00:00';

                const { error } = await window.supabaseClient
                    .from('expenses')
                    .insert({
                        created_at: expenseDate,
                        valid_date: window.currentCutDate, // Use the Cut's date
                        user_id: user.id,
                        user_name: userName,
                        category: category,
                        payment_method: method,
                        description: description,
                        amount: amount,
                        is_global: isGlobal
                    });

                if (error) throw error;

                if (msgEl) {
                    msgEl.textContent = '✅ Gasto agregado';
                    msgEl.classList.remove('hidden', 'text-danger');
                    msgEl.classList.add('text-success');
                    setTimeout(() => msgEl.classList.add('hidden'), 2000);
                }

                // Clear form
                document.getElementById('modal-add-category').value = '';
                document.getElementById('modal-add-description').value = '';
                document.getElementById('modal-add-amount').value = '';

                // Refresh ONLY the expenses list (not the whole modal, to preserve admin inputs)
                await refreshModalExpenses();

                // Refresh background tables (Daily/Weekly) respecting filters
                // This ensures "Gastos" column updates in the main table without page reload
                refreshActiveViews().catch(err => console.error('Background refresh error:', err));

            } catch (error) {
                console.error('Error adding modal expense:', error);
                if (msgEl) {
                    msgEl.textContent = '❌ Error al agregar';
                    msgEl.classList.remove('hidden', 'text-success');
                    msgEl.classList.add('text-danger');
                }
            } finally {
                modalAddExpenseBtn.disabled = false;
                modalAddExpenseBtn.textContent = '+ Agregar';
            }
        });
    }

    // Initial load - Filter by current week with Selector
    function initDailyWeekSelector() {
        const selector = document.getElementById('daily-week-select');
        if (!selector) {
            // Fallback if selector element not found (e.g. older HTML cache)
            const today = new Date();
            const day = today.getDay();
            const diff = today.getDate() - day + (day === 0 ? -6 : 1);
            const monday = new Date(today.setDate(diff));
            const sunday = new Date(today.setDate(diff + 6));

            const formatDateInput = (date) => {
                const yyyy = date.getFullYear();
                const mm = String(date.getMonth() + 1).padStart(2, '0');
                const dd = String(date.getDate()).padStart(2, '0');
                return `${yyyy}-${mm}-${dd}`;
            };
            loadCuts(formatDateInput(monday), formatDateInput(sunday));
            return;
        }

        selector.innerHTML = '';
        const today = new Date();

        // Helper to get Monday-Sunday range for a given week offset
        const getRange = (offsetWeeks) => {
            const d = new Date(today);
            d.setDate(d.getDate() - (offsetWeeks * 7));
            const day = d.getDay();
            const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
            const monday = new Date(d.setDate(diff));
            const sunday = new Date(d.setDate(diff + 6));

            const formatDateInput = (date) => {
                const y = date.getFullYear();
                const m = String(date.getMonth() + 1).padStart(2, '0');
                const d = String(date.getDate()).padStart(2, '0');
                return `${y}-${m}-${d}`;
            };
            const iso = getISOWeekAndYear(monday);
            return {
                start: formatDateInput(monday),
                end: formatDateInput(sunday),
                year: iso.year,
                week: iso.week
            };
        };

        // Populate last 12 weeks
        for (let i = 0; i < 12; i++) {
            const range = getRange(i);
            const weekStr = `${range.year}-W${range.week.toString().padStart(2, '0')}`;
            const label = formatWeekLabel(weekStr);
            const displayLabel = i === 0 ? `📌 Esta semana (${label})` : label;

            const option = document.createElement('option');
            option.value = weekStr;
            option.textContent = displayLabel;
            option.dataset.start = range.start;
            option.dataset.end = range.end;

            selector.appendChild(option);
        }

        // Event listener for change
        selector.addEventListener('change', (e) => {
            const selectedOption = selector.options[selector.selectedIndex];
            if (selectedOption) {
                const start = selectedOption.dataset.start;
                const end = selectedOption.dataset.end;

                if (dateFromInput) dateFromInput.value = start;
                if (dateToInput) dateToInput.value = end;
                loadCuts(start, end);
            }
        });

        // Trigger initial load
        selector.dispatchEvent(new Event('change'));
    }

    initDailyWeekSelector();
});
