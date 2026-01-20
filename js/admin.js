// Admin View - Audit Dashboard
document.addEventListener('DOMContentLoaded', async () => {
    // Require authentication and admin role
    const session = await window.auth.requireAuth();
    if (!session) return;

    // Check admin role
    const isAdmin = await window.auth.isAdmin();
    if (!isAdmin) {
        // For demo purposes, allow any authenticated user to access admin
        // In production, uncomment the redirect below:
        // window.location.href = '/pages/receptionist.html';
        // return;
    }

    // DOM Elements
    const cutsTableBody = document.getElementById('cuts-table-body');
    const loadingIndicator = document.getElementById('loading');
    const emptyState = document.getElementById('empty-state');
    const userInitials = document.getElementById('user-initials');
    const detailModal = document.getElementById('detail-modal');
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
    const modalAdjustmentsList = document.getElementById('modal-adjustments-list');
    const modalAdjustmentsTotal = document.getElementById('modal-adjustments-total');
    const expectedInput = document.getElementById('expected-amount');
    const differenceDisplay = document.getElementById('difference-display');
    const statusSelect = document.getElementById('status-select');
    const notesInput = document.getElementById('reviewer-notes');
    const saveReviewBtn = document.getElementById('save-review-btn');

    // Password Modal Elements
    const changePasswordBtn = document.getElementById('change-password-btn');
    const passwordModalBackdrop = document.getElementById('password-modal-backdrop');
    const closePasswordModalBtn = document.getElementById('close-password-modal');
    const changePasswordForm = document.getElementById('change-password-form');
    const newPasswordInput = document.getElementById('new-password');
    const confirmPasswordInput = document.getElementById('confirm-password');
    const passwordError = document.getElementById('password-error');
    const savePasswordBtn = document.getElementById('save-password-btn');


    // State
    let cuts = [];
    let selectedCut = null;

    // Initialize user info
    const user = await window.auth.getUser();
    if (user && userInitials) {
        const email = user.email || '';
        userInitials.textContent = email.substring(0, 2).toUpperCase();
    }

    // Format currency
    function formatCurrency(amount) {
        if (amount === null || amount === undefined) return '—';
        return new Intl.NumberFormat('es-MX', {
            style: 'currency',
            currency: 'MXN',
            minimumFractionDigits: 2
        }).format(amount);
    }

    // Format date
    function formatDate(dateStr) {
        const date = new Date(dateStr);
        return new Intl.DateTimeFormat('es-MX', {
            dateStyle: 'medium',
            timeStyle: 'short'
        }).format(date);
    }

    // Calculate total adjustments
    function calculateAdjustmentsTotal(adjustments) {
        if (!Array.isArray(adjustments)) return 0;
        return adjustments.reduce((sum, adj) => sum + (parseFloat(adj.amount) || 0), 0);
    }

    // Calculate difference and return traffic light class
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

    // Render status badge
    function renderStatusBadge(status) {
        const statusMap = {
            pending: { class: 'badge-pending', label: 'Pendiente' },
            reviewed: { class: 'badge-reviewed', label: 'Revisado' },
            disputed: { class: 'badge-disputed', label: 'Disputado' }
        };
        const config = statusMap[status] || statusMap.pending;
        return `<span class="badge ${config.class}">${config.label}</span>`;
    }

    // Render table row
    function renderTableRow(cut) {
        const diff = calculateDifference(cut.total_counted, cut.adjustments, cut.system_expected);
        const adjustmentsTotal = calculateAdjustmentsTotal(cut.adjustments);

        return `
      <tr data-id="${cut.id}">
        <td>${formatDate(cut.created_at)}</td>
        <td>${cut.user_email || 'Usuario'}</td>
        <td class="text-right">${formatCurrency(cut.total_counted)}</td>
        <td class="text-right">${formatCurrency(adjustmentsTotal)}</td>
        <td class="text-right">${formatCurrency(cut.system_expected)}</td>
        <td>
          ${diff.difference !== null ? `
            <span class="traffic-light ${diff.class}">
              <span class="traffic-light-icon"></span>
              ${formatCurrency(Math.abs(diff.difference))}
            </span>
          ` : '<span class="text-muted">—</span>'}
        </td>
        <td>${renderStatusBadge(cut.status)}</td>
      </tr>
    `;
    }

    // Load cuts data with optional date filters
    async function loadCuts(dateFrom = null, dateTo = null) {
        loadingIndicator.classList.remove('hidden');
        emptyState.classList.add('hidden');
        cutsTableBody.innerHTML = '';

        try {
            // Build query with optional date filters
            let query = window.supabaseClient
                .from('blind_cuts')
                .select('*')
                .order('created_at', { ascending: false });

            // Apply date filters if provided
            if (dateFrom) {
                query = query.gte('created_at', dateFrom + 'T00:00:00');
            }
            if (dateTo) {
                query = query.lte('created_at', dateTo + 'T23:59:59');
            }

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

    // Escape HTML
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Open detail modal
    function openModal(cut) {
        selectedCut = cut;

        // Populate modal
        modalDate.textContent = formatDate(cut.created_at);
        modalUser.textContent = cut.user_email || 'Usuario';
        modalTotalCounted.textContent = formatCurrency(cut.total_counted);

        // Render adjustments
        const adjustments = Array.isArray(cut.adjustments) ? cut.adjustments : [];
        if (adjustments.length === 0) {
            modalAdjustmentsList.innerHTML = '<p class="text-muted">Sin gastos registrados</p>';
        } else {
            modalAdjustmentsList.innerHTML = adjustments.map(adj => `
        <div class="adjustment-item">
          <span class="concept">${escapeHtml(adj.desc)}</span>
          <span class="amount">${formatCurrency(adj.amount)}</span>
        </div>
      `).join('');
        }

        const adjustmentsTotal = calculateAdjustmentsTotal(adjustments);
        modalAdjustmentsTotal.textContent = formatCurrency(adjustmentsTotal);

        // Set form values
        expectedInput.value = cut.system_expected || '';
        statusSelect.value = cut.status || 'pending';
        notesInput.value = cut.reviewer_notes || '';

        // Calculate and display difference
        updateDifferenceDisplay();

        // Show modal
        modalBackdrop.classList.add('active');
    }

    // Close modal
    function closeModal() {
        modalBackdrop.classList.remove('active');
        selectedCut = null;
    }

    // Update difference display
    function updateDifferenceDisplay() {
        if (!selectedCut) return;

        const expected = parseFloat(expectedInput.value);

        if (isNaN(expected)) {
            differenceDisplay.innerHTML = '<span class="text-muted">Ingresa el monto esperado</span>';
            return;
        }

        const diff = calculateDifference(selectedCut.total_counted, selectedCut.adjustments, expected);

        differenceDisplay.innerHTML = `
      <span class="traffic-light ${diff.class}">
        <span class="traffic-light-icon"></span>
        ${diff.label}: ${formatCurrency(Math.abs(diff.difference))}
      </span>
    `;
    }

    // Save review
    async function saveReview() {
        if (!selectedCut) return;

        const expected = parseFloat(expectedInput.value);
        const status = statusSelect.value;
        const notes = notesInput.value.trim();

        saveReviewBtn.disabled = true;
        saveReviewBtn.innerHTML = `
      <div class="spinner" style="width: 20px; height: 20px; border-width: 2px;"></div>
      Guardando...
    `;

        try {
            const { error } = await window.supabaseClient
                .from('blind_cuts')
                .update({
                    system_expected: isNaN(expected) ? null : expected,
                    status: status,
                    reviewer_notes: notes || null,
                    reviewed_at: new Date().toISOString()
                })
                .eq('id', selectedCut.id);

            if (error) throw error;

            closeModal();
            await loadCuts();

        } catch (error) {
            console.error('Error saving review:', error);
            alert('Error al guardar. Por favor intenta de nuevo.');
        } finally {
            saveReviewBtn.disabled = false;
            saveReviewBtn.innerHTML = 'Guardar Cambios';
        }
    }

    // Event Listeners
    cutsTableBody.addEventListener('click', (e) => {
        const row = e.target.closest('tr[data-id]');
        if (row) {
            const cutId = row.dataset.id;
            const cut = cuts.find(c => c.id === cutId);
            if (cut) openModal(cut);
        }
    });

    closeModalBtn.addEventListener('click', closeModal);

    modalBackdrop.addEventListener('click', (e) => {
        if (e.target === modalBackdrop) closeModal();
    });

    expectedInput.addEventListener('input', updateDifferenceDisplay);

    saveReviewBtn.addEventListener('click', saveReview);

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modalBackdrop.classList.contains('active')) {
            closeModal();
        }
    });

    // Date filter event listeners
    filterBtn.addEventListener('click', () => {
        const dateFrom = dateFromInput.value || null;
        const dateTo = dateToInput.value || null;
        loadCuts(dateFrom, dateTo);
    });

    clearFilterBtn.addEventListener('click', () => {
        dateFromInput.value = '';
        dateToInput.value = '';
        loadCuts();
    });



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

    // Initial load
    await loadCuts();
});
