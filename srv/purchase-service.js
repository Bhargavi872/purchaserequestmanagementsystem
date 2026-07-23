const cds = require('@sap/cds');

module.exports = cds.service.impl(async function () {
    const { PurchaseRequest, PurchaseRequestItems, Notifications } = this.entities;

    // ------------------------------------------------------------------------
    // Rule 28: Draft Expiry Implementation
    // ------------------------------------------------------------------------
    async function expireOldDrafts() {
        try {
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            const cutoffIsoDate = thirtyDaysAgo.toISOString();

            // Find Drafts created or updated more than 30 days ago
            const expiredDrafts = await SELECT.from(PurchaseRequest).where({
                status: 'Draft',
                createdAt: { '<=': cutoffIsoDate }
            });

            if (expiredDrafts.length > 0) {
                const draftIds = expiredDrafts.map(d => d.ID);

                // Update status to 'Expired'
                await UPDATE(PurchaseRequest)
                    .set({ status: 'Expired' })
                    .where({ ID: { in: draftIds } });

                // Create notifications for expired drafts
                for (const draft of expiredDrafts) {
                    await createNotification(
                        null,
                        draft.ID,
                        draft.requesterName,
                        `Purchase Request ${draft.purchaseRequestNo || draft.ID} has expired after 30 days of inactivity.`
                    );
                }
                console.log(`[Rule 28] Successfully expired ${expiredDrafts.length} draft purchase request(s).`);
            }
        } catch (err) {
            console.error('[Rule 28 Error] Failed to process draft expiry:', err.message);
        }
    }

    // Run Expiry Check on Service Startup & Schedule Daily Check (24h)
    cds.on('served', () => {
        expireOldDrafts();
        setInterval(expireOldDrafts, 24 * 60 * 60 * 1000);
    });

    // Explicit Action Endpoint (Optional: Can be invoked manually or via SAP Job Scheduler)
    this.on('expireOldDrafts', async () => {
        await expireOldDrafts();
        return 'Draft expiry check completed.';
    });

    // Helper: Create Notification
    async function createNotification(req, purchaseRequestId, recipient, message) {
        try {
            await INSERT.into(Notifications).entries({
                purchaseRequest_ID: purchaseRequestId,
                recipient: recipient || req?.user?.id || 'System User',
                message: message,
                status: 'Unread',
                createdDate: new Date().toISOString()
            });
        } catch (err) {
            console.error('[Notification Error]:', err.message);
        }
    }

    // Auto-generate Purchase Request Number on Initial Creation
    this.before('CREATE', PurchaseRequest, async (req) => {
        if (!req.data.purchaseRequestNo) {
            const year = new Date().getFullYear();
            let nextNumber = 1;

            const lastRequest = await SELECT.one
                .from(PurchaseRequest)
                .columns('purchaseRequestNo')
                .where({ purchaseRequestNo: { like: `PR-${year}-%` } })
                .orderBy('purchaseRequestNo desc');

            if (lastRequest?.purchaseRequestNo) {
                const parts = lastRequest.purchaseRequestNo.split('-');
                if (parts.length === 3) nextNumber = Number(parts[2]) + 1;
            }
            req.data.purchaseRequestNo = `PR-${year}-${String(nextNumber).padStart(6, '0')}`;
        }

        if (!req.data.status) {
            req.data.status = 'Draft';
        }
    });

    // Guard: Prevent modifications on closed / expired requests
    this.before('UPDATE', PurchaseRequest, async (req) => {
        if (req.target?.isDraft) return;

        const ID = req.data?.ID || req.params?.[0]?.ID;
        if (!ID) return;

        const request = await SELECT.one.from(PurchaseRequest).columns('status').where({ ID });
        if (request && ['Approved', 'Rejected', 'Cancelled', 'Expired'].includes(request.status)) {
            req.error(400, `Purchase Request is ${request.status}. It cannot be updated.`);
        }
    });

    // Guard: Prevent deletion on submitted, closed, or expired requests
    this.before('DELETE', PurchaseRequest, async (req) => {
        const ID = req.data?.ID || req.params?.[0]?.ID;
        if (!ID) return;

        const request = await SELECT.one.from(PurchaseRequest).columns('status').where({ ID });
        if (request && ['Submitted', 'Approved', 'Rejected', 'Cancelled', 'Expired'].includes(request.status)) {
            req.error(400, `Purchase Request in status '${request.status}' cannot be deleted.`);
        }
    });

    // Rule 30 Guard: Direct item-level status changes are prohibited
    this.before(['UPDATE', 'PATCH'], PurchaseRequestItems, async (req) => {
        if ('status' in req.data) {
            req.error(400, 'Rule 30: Item-level approval is not allowed. Process the entire request from the header level.');
        }
    });

    // Field-level validations and amount calculations
    this.before(['CREATE', 'UPDATE'], PurchaseRequest, async (req) => {
        // 1. Department Validation
        const validDepartments = ['Finance', 'HR', 'Procurement', 'Manufacturing', 'IT'];
        if (req.data.department && !validDepartments.includes(req.data.department)) {
            req.error(400, `Invalid Department. Valid departments: ${validDepartments.join(', ')}`);
        }

        // 2. Request Date Validation
        if (req.data.requestDate) {
            const requestDate = new Date(req.data.requestDate);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            requestDate.setHours(0, 0, 0, 0);

            if (requestDate > today) {
                req.error(400, 'Request Date cannot be in the future.');
            }

            const thirtyDaysAgo = new Date(today);
            thirtyDaysAgo.setDate(today.getDate() - 30);
            if (requestDate < thirtyDaysAgo) {
                req.error(400, 'Request Date cannot be more than 30 days old.');
            }
        }

        // 3. Item Calculations
        if (req.data.items && Array.isArray(req.data.items)) {
            if (req.data.items.length > 20) {
                req.error(400, 'A Purchase Request cannot contain more than 20 items.');
            }

            const materialNumbers = new Set();
            let totalAmount = 0;

            for (const item of req.data.items) {
                if (item.materialNumber) {
                    if (materialNumbers.has(item.materialNumber)) {
                        req.error(400, `Duplicate Material Number '${item.materialNumber}' within the same request.`);
                    }
                    materialNumbers.add(item.materialNumber);
                }

                if (item.quantity !== undefined && item.quantity !== null) {
                    if (item.quantity <= 0) req.error(400, 'Quantity must be greater than 0.');
                    if (item.quantity > 100) req.error(400, 'Quantity cannot exceed 100.');
                }

                if (item.unitPrice !== undefined && item.unitPrice !== null) {
                    if (item.unitPrice <= 0) req.error(400, 'Unit Price must be greater than 0.');
                    if (item.unitPrice >= 100000) req.error(400, 'Unit Price must be less than 1,00,000.');
                }

                if (item.quantity && item.unitPrice) {
                    item.netAmount = item.quantity * item.unitPrice;
                    item.tax = item.netAmount * 0.18;
                    item.grossAmount = item.netAmount + item.tax;
                    item.totalPrice = item.grossAmount;
                    totalAmount += Number(item.grossAmount);
                }
            }

            req.data.totalAmount = totalAmount;
        }
    });

    // ------------------------------------------------------------------------
    // Custom Bound Actions
    // ------------------------------------------------------------------------

    // Submit Request Action
    this.on('submitRequest', async (req) => {
        const targetQuery = req.subject;
        const request = await SELECT.one.from(targetQuery);

        if (!request) {
            return req.error(404, 'Purchase Request not found.');
        }

        const currentStatus = (request.status || 'DRAFT').toUpperCase();
        if (currentStatus === 'EXPIRED') {
            return req.error(400, 'This Purchase Request has expired and cannot be submitted.');
        }
        if (currentStatus !== 'DRAFT') {
            return req.error(400, `Only Draft Purchase Requests can be submitted. Current status: ${request.status}`);
        }

        // --------------------------------------------------------------------
        // Rule 1: Must contain at least one line item before submitting
        // --------------------------------------------------------------------
        const items = await SELECT.from(PurchaseRequestItems).where({ parent_ID: request.ID });
        if (!items || items.length === 0) {
            return req.error(400, 'Rule 1: At least one item must exist before submitting a Purchase Request.');
        }

        if ((request.totalAmount || 0) <= 100) {
            return req.error(400, 'Purchase Request Total Amount must be greater than ₹100 before submitting.');
        }

        // Set status to Submitted
        await UPDATE(targetQuery).set({ status: 'Submitted' });

        await createNotification(
            req,
            request.ID,
            request.requesterName,
            `Purchase Request ${request.purchaseRequestNo || request.ID} has been submitted successfully.`
        );

        req.notify(`Purchase Request ${request.purchaseRequestNo || ''} submitted successfully.`);
        return SELECT.one.from(targetQuery);
    });

    // Approve Action (Rule 30: All-or-Nothing Item Validation)
    this.on('approveRequest', async (req) => {
        const targetQuery = req.subject;
        const request = await SELECT.one.from(targetQuery);

        if (!request) return req.error(404, 'Purchase Request not found.');
        if (request.status !== 'Submitted') {
            return req.error(400, 'Only Submitted Purchase Requests can be approved.');
        }

        // Fetch associated line items
        const items = await SELECT.from(PurchaseRequestItems).where({ parent_ID: request.ID });

        if (!items || items.length === 0) {
            return req.error(400, 'Cannot approve a Purchase Request with no items.');
        }

        // Rule 30 Validation: Evaluate all rules across the entire item batch
        const invalidItems = [];
        for (const item of items) {
            if (!item.materialNumber) {
                invalidItems.push(`Item ID ${item.ID}: Missing Material Number.`);
            }
            if (!item.quantity || item.quantity <= 0 || item.quantity > 100) {
                invalidItems.push(`Item '${item.materialNumber || item.ID}': Invalid quantity (${item.quantity}).`);
            }
            if (!item.unitPrice || item.unitPrice <= 0 || item.unitPrice >= 100000) {
                invalidItems.push(`Item '${item.materialNumber || item.ID}': Invalid unit price (${item.unitPrice}).`);
            }
        }

        // Rule 30 Enforcement: If ANY item fails, reject the ENTIRE request batch
        if (invalidItems.length > 0) {
            await UPDATE(targetQuery).set({ status: 'Rejected' });
            await UPDATE(PurchaseRequestItems).where({ parent_ID: request.ID }).set({ status: 'Rejected' });

            await createNotification(
                req,
                request.ID,
                request.requesterName,
                `Purchase Request ${request.purchaseRequestNo || request.ID} was rejected due to line-item rule failures.`
            );

            return req.error(400, `Rule 30 Applied: One or more line items failed validation. The entire request was REJECTED.\n` + invalidItems.join('\n'));
        }

        // If ALL items pass validation, approve the ENTIRE batch
        await UPDATE(targetQuery).set({ status: 'Approved' });
        await UPDATE(PurchaseRequestItems).where({ parent_ID: request.ID }).set({ status: 'Approved' });

        await createNotification(
            req,
            request.ID,
            request.requesterName,
            `Purchase Request ${request.purchaseRequestNo || request.ID} has been approved.`
        );

        req.notify(`Purchase Request ${request.purchaseRequestNo || ''} approved successfully.`);
        return SELECT.one.from(targetQuery);
    });

    // Reject Action (Rule 30: Rejects Header + All Items)
    this.on('rejectRequest', async (req) => {
        const targetQuery = req.subject;
        const request = await SELECT.one.from(targetQuery);

        if (!request) return req.error(404, 'Purchase Request not found.');
        if (request.status !== 'Submitted') {
            return req.error(400, 'Only Submitted Purchase Requests can be rejected.');
        }

        // Update Header and ALL Line Items to Rejected simultaneously
        await UPDATE(targetQuery).set({ status: 'Rejected' });
        await UPDATE(PurchaseRequestItems).where({ parent_ID: request.ID }).set({ status: 'Rejected' });

        await createNotification(
            req,
            request.ID,
            request.requesterName,
            `Purchase Request ${request.purchaseRequestNo || request.ID} has been rejected.`
        );

        req.notify(`Purchase Request ${request.purchaseRequestNo || ''} rejected.`);
        return SELECT.one.from(targetQuery);
    });

    // Cancel Action
    this.on('cancelRequest', async (req) => {
        const targetQuery = req.subject;
        const request = await SELECT.one.from(targetQuery);

        if (!request) return req.error(404, 'Purchase Request not found.');
        if (['Approved', 'Cancelled', 'Expired'].includes(request.status)) {
            return req.error(400, `Purchase Request in status '${request.status}' cannot be cancelled.`);
        }

        await UPDATE(targetQuery).set({ status: 'Cancelled' });

        await createNotification(
            req,
            request.ID,
            request.requesterName,
            `Purchase Request ${request.purchaseRequestNo || request.ID} has been cancelled.`
        );

        req.notify(`Purchase Request ${request.purchaseRequestNo || ''} cancelled.`);
        return SELECT.one.from(targetQuery);
    });
});