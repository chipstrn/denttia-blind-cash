// Receptionist View - Blind Cash Closing Form
document.addEventListener('DOMContentLoaded', async () => {
    // Require authentication
    const session = await window.auth.requireAuth();
    if (!session) return;

    // DOM Elements
    const form = document.getElementById('cash-closing-form');
    const totalInput = document.getElementById('total-counted');
    const adjustmentsList = document.getElementById('adjustments-list');
    const conceptInput = document.getElementById('adjustment-concept');
    const amountInput = document.getElementById('adjustment-amount');
    const addAdjustmentBtn = document.getElementById('add-adjustment-btn');
    const submitBtn = document.getElementById('submit-btn');
    const formView = document.getElementById('form-view');
    const successView = document.getElementById('success-view');
    const userInitials = document.getElementById('user-initials');
    const newClosingBtn = document.getElementById('new-closing-btn');

    // State
    let adjustments = [];

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

    // Render adjustments list
    function renderAdjustments() {
        adjustmentsList.innerHTML = '';

        if (adjustments.length === 0) {
            adjustmentsList.innerHTML = `
        <p class="text-muted text-center" style="padding: var(--space-4);">
          Sin gastos registrados
        </p>
      `;
            return;
        }

        adjustments.forEach((adj, index) => {
            const item = document.createElement('div');
            item.className = 'adjustment-item';
            item.innerHTML = `
        <span class="concept">${escapeHtml(adj.desc)}</span>
        <span class="amount">${formatCurrency(adj.amount)}</span>
        <button type="button" class="remove-btn" data-index="${index}" aria-label="Eliminar">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      `;
            adjustmentsList.appendChild(item);
        });
    }

    // Escape HTML to prevent XSS
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Add adjustment handler
    addAdjustmentBtn.addEventListener('click', () => {
        const concept = conceptInput.value.trim();
        const amount = parseFloat(amountInput.value);

        if (!concept) {
            conceptInput.focus();
            return;
        }

        if (isNaN(amount) || amount < 0) {
            amountInput.focus();
            return;
        }

        adjustments.push({
            desc: concept,
            amount: amount
        });

        // Clear inputs
        conceptInput.value = '';
        amountInput.value = '';
        conceptInput.focus();

        renderAdjustments();
    });

    // Remove adjustment handler (event delegation)
    adjustmentsList.addEventListener('click', (e) => {
        const removeBtn = e.target.closest('.remove-btn');
        if (removeBtn) {
            const index = parseInt(removeBtn.dataset.index, 10);
            adjustments.splice(index, 1);
            renderAdjustments();
        }
    });

    // Validate total input (prevent negative numbers)
    totalInput.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        if (value < 0) {
            e.target.value = 0;
        }
    });

    // Form submission
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const totalCounted = parseFloat(totalInput.value);

        // Validation
        if (isNaN(totalCounted) || totalCounted < 0) {
            totalInput.focus();
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

            // Insert blind cut record
            const { data, error } = await window.supabaseClient
                .from('blind_cuts')
                .insert({
                    user_id: user.id,
                    total_counted: totalCounted,
                    adjustments: adjustments,
                    status: 'pending'
                });

            if (error) throw error;

            // Show success view (blind feedback - never shows if amounts match)
            formView.classList.add('hidden');
            successView.classList.remove('hidden');

            // Reset form state
            adjustments = [];
            form.reset();
            renderAdjustments();

        } catch (error) {
            console.error('Error saving blind cut:', error);
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

    // New closing button
    if (newClosingBtn) {
        newClosingBtn.addEventListener('click', () => {
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
    renderAdjustments();
});
