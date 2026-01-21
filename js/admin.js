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
    function getWeekNumber(d) {
        d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
        d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
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
            const year = d.getFullYear();
            const week = getWeekNumber(d);
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
        const diff = calculateDifference(cut.total_counted, cut.adjustments, cut.system_expected);
        const adjustmentsTotal = calculateAdjustmentsTotal(cut.adjustments);

        return `
            <tr data-id="${cut.id}">
                <td data-label="Fecha">${formatDate(cut.created_at)}</td>
                <td data-label="Usuario">${cut.user_name || 'Usuario'}</td>
                <td data-label="Contado" class="text-right">${formatCurrency(cut.total_counted)}</td>
                <td data-label="Gastos" class="text-right">${formatCurrency(adjustmentsTotal)}</td>
                <td data-label="Esperado" class="text-right">${formatCurrency(cut.system_expected)}</td>
                <td data-label="Diferencia">
                    ${diff.difference !== null ? `
                        <span class="traffic-light ${diff.class}">
                            <span class="traffic-light-icon"></span>
                            ${formatCurrency(Math.abs(diff.difference))}
                        </span>
                    ` : '<span class="text-muted">—</span>'}
                </td>
                <td data-label="Estado">${renderStatusBadge(cut.status)}</td>
            </tr>
        `;
    }

    async function loadCuts(dateFrom = null, dateTo = null) {
        loadingIndicator.classList.remove('hidden');
        emptyState.classList.add('hidden');
        cutsTableBody.innerHTML = '';

        try {
            let query = window.supabaseClient
                .from('blind_cuts')
                .select('*')
                .order('created_at', { ascending: false });

            if (dateFrom) query = query.gte('created_at', dateFrom + 'T00:00:00');
            if (dateTo) query = query.lte('created_at', dateTo + 'T23:59:59');

            const { data, error } = await query;
            if (error) throw error;
            cuts = data || [];

            if (cuts.length === 0) {
                emptyState.classList.remove('hidden');
            } else {
                cutsTableBody.innerHTML = cuts.map(renderTableRow).join('');
            }
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
        const cutDate = new Date(cut.created_at);
        const cutDateStr = cutDate.toISOString().split('T')[0];
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
                .gte('created_at', dayStart)
                .lte('created_at', dayEnd)
                .order('created_at', { ascending: true });

            if (error) throw error;

            if (expenses && expenses.length > 0) {
                // Render expenses with user name
                modalExpensesList.innerHTML = expenses.map(exp => `
                    <div class="expense-item" style="padding: var(--space-3); border-radius: var(--radius-md); background: var(--bg-secondary); margin-bottom: var(--space-2);">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-1);">
                            <span style="font-size: var(--font-size-sm); color: var(--text-secondary);">👤 ${exp.user_name || 'Usuario'}</span>
                            <span class="expense-amount" style="font-weight: 600; color: var(--text-primary);">${formatCurrency(exp.amount)}</span>
                        </div>
                        <div style="display: flex; gap: var(--space-2); flex-wrap: wrap; margin-bottom: var(--space-1);">
                            <span style="font-size: var(--font-size-xs); padding: 2px 6px; border-radius: var(--radius-sm); background: var(--bg-tertiary);">${categoryLabels[exp.category] || exp.category}</span>
                            <span style="font-size: var(--font-size-xs); padding: 2px 6px; border-radius: var(--radius-sm); background: ${exp.payment_method === 'efectivo' ? 'var(--success-light)' : exp.payment_method === 'transferencia' ? 'var(--info-light)' : 'var(--warning-light)'}; color: ${exp.payment_method === 'efectivo' ? 'var(--success)' : exp.payment_method === 'transferencia' ? 'var(--info)' : 'var(--warning)'};">${methodLabels[exp.payment_method] || exp.payment_method}</span>
                        </div>
                        <div style="font-size: var(--font-size-sm); color: var(--text-muted);">${escapeHtml(exp.description)}</div>
                    </div>
                `).join('');

                // Calculate and show total
                const total = expenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);
                modalTotalExpenses.textContent = formatCurrency(total);
                modalExpensesTotal.classList.remove('hidden');
            } else {
                modalExpensesList.innerHTML = '<p class="text-muted text-center">Sin gastos registrados este día</p>';
                modalExpensesTotal.classList.add('hidden');
            }
        } catch (error) {
            console.error('Error fetching expenses:', error);
            modalExpensesList.innerHTML = '<p class="text-muted text-center">Error al cargar gastos</p>';
            modalExpensesTotal.classList.add('hidden');
        }

        modalBackdrop.classList.add('active');
    }

    function closeModal() {
        modalBackdrop.classList.remove('active');
        selectedCut = null;
    }

    function updateDifferenceDisplay() {
        if (!selectedCut) return;

        const expectedCash = parseFloat(expectedCashInput.value);
        const expectedVoucher = parseFloat(expectedVoucherInput.value);
        const cashCounted = parseFloat(selectedCut.cash_counted) || 0;
        const voucherCounted = parseFloat(selectedCut.voucher_counted) || 0;

        // Check if at least one expected value is entered
        const hasCashExpected = !isNaN(expectedCash);
        const hasVoucherExpected = !isNaN(expectedVoucher);

        if (!hasCashExpected && !hasVoucherExpected) {
            differenceDisplay.innerHTML = '<span class="text-muted">Ingresa los montos esperados</span>';
            return;
        }

        let html = '';
        let totalDiff = 0;

        // Cash difference
        if (hasCashExpected) {
            const cashDiff = cashCounted - expectedCash;
            totalDiff += cashDiff;
            const cashClass = cashDiff === 0 ? 'exact' : (cashDiff > 0 ? 'over' : 'under');
            const cashLabel = cashDiff === 0 ? 'Exacto' : (cashDiff > 0 ? 'Sobrante' : 'Faltante');
            html += `
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="color: var(--text-secondary);">💵 Efectivo:</span>
                    <span class="traffic-light ${cashClass}" style="font-size: 0.9rem;">
                        <span class="traffic-light-icon"></span>
                        ${cashLabel}: ${formatCurrency(Math.abs(cashDiff))}
                    </span>
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

            await loadCuts();
            await loadWeeklyAudit();
            closeModal();
        } catch (error) {
            console.error('Error saving review:', error);
            alert('Error al guardar. Por favor intenta de nuevo.');
        } finally {
            saveReviewBtn.disabled = false;
            saveReviewBtn.textContent = 'Guardar Cambios';
        }
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

    async function loadWeeklyAuditCore(start, end) {
        weekExpensesLoading?.classList.remove('hidden');

        try {
            // Load income (blind_cuts) with all fields for differences
            const { data: incomeData, error: incomeError } = await window.supabaseClient
                .from('blind_cuts')
                .select('*')
                .gte('created_at', start + 'T00:00:00')
                .lte('created_at', end + 'T23:59:59')
                .order('created_at', { ascending: true });

            if (incomeError) throw incomeError;

            const cuts = incomeData || [];
            const totalIncome = cuts.reduce((sum, cut) => sum + parseFloat(cut.total_counted || 0), 0);

            // Calculate total differences (using split expected amounts)
            let totalDifference = 0;
            cuts.forEach(cut => {
                const hasCashExpected = cut.expected_cash !== null && cut.expected_cash !== undefined;
                const hasVoucherExpected = cut.expected_voucher !== null && cut.expected_voucher !== undefined;
                if (hasCashExpected) {
                    totalDifference += parseFloat(cut.cash_counted || 0) - parseFloat(cut.expected_cash || 0);
                }
                if (hasVoucherExpected) {
                    totalDifference += parseFloat(cut.voucher_counted || 0) - parseFloat(cut.expected_voucher || 0);
                }
            });

            // Load expenses
            const { data: expenseData, error: expenseError } = await window.supabaseClient
                .from('expenses')
                .select('*')
                .gte('created_at', start + 'T00:00:00')
                .lte('created_at', end + 'T23:59:59')
                .order('created_at', { ascending: false });

            if (expenseError) throw expenseError;

            const expenses = expenseData || [];
            const totalExpensesAmount = expenses.reduce((sum, exp) => sum + parseFloat(exp.amount || 0), 0);

            // Update summary cards
            weekIncome.textContent = formatCurrency(totalIncome);
            weekExpenses.textContent = formatCurrency(totalExpensesAmount);
            weekBalance.textContent = formatCurrency(totalIncome - totalExpensesAmount);

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
                        const counted = parseFloat(cut.total_counted || 0);
                        const cashCounted = parseFloat(cut.cash_counted || 0);
                        const voucherCounted = parseFloat(cut.voucher_counted || 0);
                        const expectedCash = cut.expected_cash !== null ? parseFloat(cut.expected_cash) : null;
                        const expectedVoucher = cut.expected_voucher !== null ? parseFloat(cut.expected_voucher) : null;

                        // Calculate total expected and difference
                        let totalExpected = null;
                        let diff = null;
                        if (expectedCash !== null || expectedVoucher !== null) {
                            totalExpected = (expectedCash || 0) + (expectedVoucher || 0);
                            const cashDiff = expectedCash !== null ? cashCounted - expectedCash : 0;
                            const voucherDiff = expectedVoucher !== null ? voucherCounted - expectedVoucher : 0;
                            diff = cashDiff + voucherDiff;
                        }

                        const diffClass = diff === null ? '' : diff === 0 ? 'text-success' : diff < 0 ? 'text-danger' : 'text-warning';
                        const statusBadge = renderStatusBadge(cut.status);

                        return `
                            <tr class="clickable-row" data-cut-index="${index}" title="Clic para ver detalles">
                                <td data-label="Fecha">${formatDateShort(cut.created_at)}</td>
                                <td data-label="Usuario">${cut.user_name || 'Usuario'}</td>
                                <td data-label="Contado" class="text-right number-formatted" style="font-weight: 600;">${formatCurrency(counted)}</td>
                                <td data-label="Esperado" class="text-right number-formatted">${totalExpected !== null ? formatCurrency(totalExpected) : '<span class="text-muted">—</span>'}</td>
                                <td data-label="Diferencia" class="text-right ${diffClass} number-formatted" style="font-weight: 600;">${diff !== null ? (diff >= 0 ? '+' : '') + formatCurrency(diff) : '<span class="text-muted">—</span>'}</td>
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
                        <td data-label="Categoría">${categoryLabels[exp.category] || exp.category}</td>
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

    function openEditExpenseModal(expense) {
        if (!editExpenseModalBackdrop) return;

        // Fill form
        editExpenseId.value = expense.id;
        editExpenseCategory.value = expense.category;
        editExpenseMethod.value = expense.payment_method;
        editExpenseDescription.value = expense.description;
        editExpenseAmount.value = expense.amount;

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
                        amount: amount
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

                // Refresh list (await to ensure it completes before alert)
                await loadCuts(dateFromInput.value || null, dateToInput.value || null);
                await loadWeeklyAudit();

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

    // Load current week on init
    loadWeeklyAudit();

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
            const category = adminExpenseCategory?.value;
            const method = adminExpenseMethod?.value || 'efectivo';
            const description = adminExpenseDescription?.value?.trim();
            const amount = parseFloat(adminExpenseAmount?.value);

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

                // Determine date based on selected week
                let expenseDate = new Date();
                const weekValue = weekSelect?.value;

                if (weekValue) {
                    const { startDate, endDate } = getWeekDates(weekValue);
                    // Check if "now" is inside the selected week
                    const now = new Date();
                    const start = new Date(startDate); start.setHours(0, 0, 0, 0);
                    const end = new Date(endDate); end.setHours(23, 59, 59, 999);

                    if (now < start || now > end) {
                        // If we are auditing a different week (e.g. past), default to the Sunday of that week
                        expenseDate = new Date(endDate);
                        expenseDate.setHours(20, 0, 0, 0); // 8:00 PM
                    }
                }

                const { error } = await window.supabaseClient
                    .from('expenses')
                    .insert({
                        created_at: expenseDate.toISOString(),
                        user_id: user.id,
                        user_name: userName,
                        category: category,
                        payment_method: method,
                        description: description,
                        amount: amount
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

                // Reload weekly data if on same week
                await loadWeeklyAudit();

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
            const description = document.getElementById('modal-add-description')?.value?.trim();
            const amount = parseFloat(document.getElementById('modal-add-amount')?.value);
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
                        user_id: user.id,
                        user_name: userName,
                        category: category,
                        payment_method: method,
                        description: description,
                        amount: amount
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

                // Refresh expenses list in modal
                if (selectedCut) {
                    openModal(selectedCut);
                }

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
            return {
                start: formatDateInput(monday),
                end: formatDateInput(sunday),
                year: monday.getFullYear(),
                week: getWeekNumber(monday)
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
