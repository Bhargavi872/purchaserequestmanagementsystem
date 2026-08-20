const cds = require('@sap/cds');

module.exports = cds.service.impl(async function () {

    // ============================================================
    // Service Entities
    // ============================================================

    const {
        PurchaseRequest,
        PurchaseRequestItems,
        Notifications,
        AuditLogs
    } = this.entities;


    // ============================================================
    // AUDIT LOG FUNCTION
    // ============================================================
    // This function creates ONE audit record for an actual
    // business action.
    //
    // CREATE
    // SUBMIT
    // APPROVE
    // REJECT
    // CANCEL
    //
    // IMPORTANT:
    // We DO NOT create audit logs from a generic UPDATE handler.
    // This prevents Fiori draft operations from creating duplicate
    // audit records.
    // ============================================================

    async function createAuditLog({
        purchaseRequestID,
        oldStatus,
        newStatus,
        action,
        user
    }) {

        await INSERT.into(AuditLogs).entries({

            purchaseRequest_ID: purchaseRequestID,

            oldStatus: oldStatus || 'New',

            newStatus: newStatus || '',

            user: user || 'System',

            timestamp: new Date(),

            action: action

        });
    }


    // ============================================================
    // RULE 17 - APPROVAL MATRIX
    // ============================================================
    //
    // 0 - 10,000       -> Manager
    // 10,001 - 50,000  -> Senior Manager
    // Above 50,000     -> Director
    //
    // Approver is automatically determined.
    // ============================================================

    function determineApprover(totalAmount) {

        const amount = Number(totalAmount || 0);

        if (amount <= 10000) {
            return 'Manager';
        }

        if (amount <= 50000) {
            return 'Senior Manager';
        }

        return 'Director';
    }


    // ============================================================
    // RULE 9 - PURCHASE REQUEST NUMBER GENERATION
    // ============================================================
    //
    // Format:
    // PR-2026-000001
    //
    // User should not enter the number manually.
    // ============================================================

    this.before('CREATE', PurchaseRequest, async (req) => {

        const year = new Date().getFullYear();

        let nextNumber = 1;

        const lastRequest = await SELECT.one
            .from(PurchaseRequest)
            .columns('purchaseRequestNo')
            .where({
                purchaseRequestNo: {
                    like: `PR-${year}-%`
                }
            })
            .orderBy('purchaseRequestNo desc');

        if (
            lastRequest &&
            lastRequest.purchaseRequestNo
        ) {

            const parts =
                lastRequest.purchaseRequestNo.split('-');

            if (parts.length === 3) {

                const lastNumber =
                    Number(parts[2]);

                if (!isNaN(lastNumber)) {
                    nextNumber = lastNumber + 1;
                }
            }
        }

        // Automatically generate PR number
        req.data.purchaseRequestNo =
            `PR-${year}-${String(nextNumber).padStart(6, '0')}`;

        // Default status
        req.data.status = 'Draft';


        // ========================================================
        // AUDIT - CREATE
        // ========================================================

        await createAuditLog({
            purchaseRequestID: req.data.ID,
            oldStatus: 'New',
            newStatus: 'Draft',
            action: 'CREATE',
            user: req.user?.id || 'anonymous'
        });
    });


    // ============================================================
    // RULE 12 - DEPARTMENT VALIDATION
    // RULE 22 - REQUEST DATE VALIDATION
    // RULE 10 - MAXIMUM 20 ITEMS
    // RULE 2 / 14 - QUANTITY VALIDATION
    // RULE 7 - DUPLICATE MATERIAL NUMBER
    // RULE 13 - DESCRIPTION VALIDATION
    // RULE 15 - UNIT PRICE VALIDATION
    // RULE 16 - TAX / TOTAL CALCULATION
    // RULE 23 - MINIMUM AMOUNT
    // RULE 17 - APPROVER CALCULATION
    // ============================================================

    this.before(
        ['CREATE', 'UPDATE'],
        PurchaseRequest,
        async (req) => {

            // ----------------------------------------------------
            // Only Draft requests can be edited
            // ----------------------------------------------------

            if (req.event === 'UPDATE') {

                const existingRequest =
                    await SELECT.one
                        .from(PurchaseRequest)
                        .columns('status')
                        .where({
                            ID: req.data.ID
                        });

                if (
                    existingRequest &&
                    existingRequest.status !== 'Draft'
                ) {

                    req.error(
                        400,
                        'Only Purchase Requests in Draft status can be edited.'
                    );
                }
            }


            // ----------------------------------------------------
            // Rule 12 - Department Validation
            // ----------------------------------------------------

            const validDepartments = [
                'Finance',
                'HR',
                'Procurement',
                'Manufacturing',
                'IT'
            ];

            if (
                req.data.department &&
                !validDepartments.includes(
                    req.data.department
                )
            ) {

                req.error(
                    400,
                    `Invalid Department. Valid Departments are: ${validDepartments.join(', ')}`
                );
            }


            // ----------------------------------------------------
            // Rule 22 - Request Date Validation
            // ----------------------------------------------------

            if (req.data.requestDate) {

                const requestDate =
                    new Date(req.data.requestDate);

                const today = new Date();

                today.setHours(0, 0, 0, 0);
                requestDate.setHours(0, 0, 0, 0);


                if (requestDate > today) {

                    req.error(
                        400,
                        'Request Date cannot be a future date.'
                    );
                }


                const thirtyDaysAgo =
                    new Date(today);

                thirtyDaysAgo.setDate(
                    today.getDate() - 30
                );


                if (requestDate < thirtyDaysAgo) {

                    req.error(
                        400,
                        'Request Date cannot be more than 30 days old.'
                    );
                }
            }


            // ----------------------------------------------------
            // Rule 10 - Maximum 20 Items
            // ----------------------------------------------------

            if (
                req.data.items &&
                req.data.items.length > 20
            ) {

                req.error(
                    400,
                    'A Purchase Request cannot contain more than 20 items.'
                );
            }


            // ----------------------------------------------------
            // Item validations
            // ----------------------------------------------------

            if (
                req.data.items &&
                req.data.items.length > 0
            ) {

                let totalAmount = 0;

                const materialNumbers = new Set();


                for (const item of req.data.items) {

                    // ============================================
                    // Rule 2 - Quantity > 0
                    // Rule 14 - Quantity <= 100
                    // ============================================

                    if (
                        item.quantity !== undefined &&
                        item.quantity !== null
                    ) {

                        if (item.quantity <= 0) {

                            req.error(
                                400,
                                'Quantity should always be greater than zero.'
                            );
                        }


                        if (item.quantity > 100) {

                            req.error(
                                400,
                                'Quantity cannot exceed 100.'
                            );
                        }
                    }


                    // ============================================
                    // Rule 7 - Duplicate Material Numbers
                    // ============================================

                    if (item.materialNumber) {

                        if (
                            materialNumbers.has(
                                item.materialNumber
                            )
                        ) {

                            req.error(
                                400,
                                `Duplicate Material Number '${item.materialNumber}' is not allowed within the same Purchase Request.`
                            );
                        }

                        materialNumbers.add(
                            item.materialNumber
                        );
                    }


                    // ============================================
                    // Rule 13 - Description Validation
                    // ============================================

                    if (
                        item.description === undefined ||
                        item.description === null ||
                        item.description.trim() === ''
                    ) {

                        req.error(
                            400,
                            'Material Description cannot be empty.'
                        );
                    }


                    if (
                        item.description &&
                        item.description.trim().length < 10
                    ) {

                        req.error(
                            400,
                            'Material Description should contain at least 10 characters.'
                        );
                    }


                    // ============================================
                    // Rule 15 - Unit Price Validation
                    // ============================================

                    if (
                        item.unitPrice !== undefined &&
                        item.unitPrice !== null
                    ) {

                        if (item.unitPrice <= 0) {

                            req.error(
                                400,
                                'Unit Price should be greater than 0.'
                            );
                        }


                        if (item.unitPrice >= 100000) {

                            req.error(
                                400,
                                'Unit Price should be less than 1,00,000.'
                            );
                        }
                    }


                    // ============================================
                    // Rule 16 - Automatic Tax Calculation
                    // ============================================

                    if (
                        item.quantity !== undefined &&
                        item.quantity !== null &&
                        item.unitPrice !== undefined &&
                        item.unitPrice !== null
                    ) {

                        item.netAmount =
                            Number(item.quantity) *
                            Number(item.unitPrice);


                        // 18% tax
                        item.tax =
                            Number(item.netAmount) * 0.18;


                        // Gross amount
                        item.grossAmount =
                            Number(item.netAmount) +
                            Number(item.tax);


                        // Total price
                        item.totalPrice =
                            item.grossAmount;


                        totalAmount +=
                            Number(item.grossAmount);
                    }
                }


                // ================================================
                // Rule 5 - Total Amount
                // ================================================

                req.data.totalAmount =
                    totalAmount;


                // ================================================
                // Rule 23 - Minimum Amount
                // ================================================

                if (totalAmount <= 100) {

                    req.error(
                        400,
                        'Purchase Request Total Amount should be greater than ₹100.'
                    );
                }


                // ================================================
                // Rule 17 - Automatically Determine Approver
                // ================================================

                req.data.approver =
                    determineApprover(totalAmount);
            }
        }
    );


    // ============================================================
    // RULE 11 - DUPLICATE PURCHASE REQUEST
    // ============================================================

    this.before(
        ['CREATE', 'UPDATE'],
        PurchaseRequest,
        async (req) => {

            if (
                !req.data.requesterName ||
                !req.data.department ||
                !req.data.items ||
                req.data.items.length === 0
            ) {
                return;
            }


            const sevenDaysAgo =
                new Date();

            sevenDaysAgo.setDate(
                sevenDaysAgo.getDate() - 7
            );


            const existingRequests =
                await SELECT
                    .from(PurchaseRequest)
                    .columns(
                        'ID',
                        'requestDate'
                    )
                    .where({
                        requesterName:
                            req.data.requesterName,

                        department:
                            req.data.department
                    });


            for (
                const existingRequest
                of existingRequests
            ) {

                // Ignore same request during UPDATE
                if (
                    req.event === 'UPDATE' &&
                    existingRequest.ID === req.data.ID
                ) {
                    continue;
                }


                if (
                    existingRequest.requestDate &&
                    new Date(existingRequest.requestDate)
                        >= sevenDaysAgo
                ) {

                    const existingItems =
                        await SELECT
                            .from(PurchaseRequestItems)
                            .where({
                                parent_ID:
                                    existingRequest.ID
                            });


                    for (
                        const currentItem
                        of req.data.items
                    ) {

                        const duplicate =
                            existingItems.find(
                                existingItem =>
                                    existingItem.materialNumber ===
                                    currentItem.materialNumber &&

                                    Number(
                                        existingItem.quantity
                                    ) ===
                                    Number(
                                        currentItem.quantity
                                    )
                            );


                        if (duplicate) {

                            req.error(
                                400,
                                'Duplicate Purchase Request is not allowed. The same requester cannot create another request with the same Material Number, Quantity and Department within the last 7 days.'
                            );
                        }
                    }
                }
            }
        }
    );


    // ============================================================
    // PURCHASE REQUEST UPDATE RESTRICTION
    // ============================================================

    this.before(
        'UPDATE',
        PurchaseRequest,
        async (req) => {

            const request =
                await SELECT.one
                    .from(PurchaseRequest)
                    .columns(
                        'status',
                        'purchaseRequestNo'
                    )
                    .where({
                        ID: req.data.ID
                    });


            if (!request) {
                return;
            }


            // ----------------------------------------------------
            // Approved / Rejected / Cancelled cannot be modified
            // ----------------------------------------------------

            if (
                [
                    'Approved',
                    'Rejected',
                    'Cancelled'
                ].includes(request.status)
            ) {

                req.error(
                    400,
                    `Purchase Request is ${request.status}. It is read-only and cannot be updated.`
                );
            }


            // ----------------------------------------------------
            // PR Number cannot be manually changed
            // ----------------------------------------------------

            if (
                req.data.purchaseRequestNo &&
                req.data.purchaseRequestNo !==
                    request.purchaseRequestNo
            ) {

                req.error(
                    400,
                    'Purchase Request Number is automatically generated and cannot be changed.'
                );
            }
        }
    );


    // ============================================================
    // PURCHASE REQUEST DELETE RESTRICTION
    // ============================================================

    this.before(
        'DELETE',
        PurchaseRequest,
        async (req) => {

            const request =
                await SELECT.one
                    .from(PurchaseRequest)
                    .columns('status')
                    .where({
                        ID: req.data.ID
                    });


            if (
                request &&
                [
                    'Approved',
                    'Rejected',
                    'Cancelled'
                ].includes(request.status)
            ) {

                req.error(
                    400,
                    `Purchase Request is ${request.status}. It cannot be deleted.`
                );
            }
        }
    );


    // ============================================================
    // RULE 24
    // ITEM DELETE RESTRICTION
    // ============================================================

    this.before(
        'DELETE',
        PurchaseRequestItems,
        async (req) => {

            const ID =
                req.data.ID ||
                (
                    req.params[0] &&
                    req.params[0].ID
                );


            if (!ID) {

                return req.error(
                    400,
                    'Purchase Request Item ID is missing.'
                );
            }


            const item =
                await SELECT.one
                    .from(PurchaseRequestItems)
                    .columns('parent_ID')
                    .where({
                        ID
                    });


            if (!item) {

                return req.error(
                    404,
                    'Purchase Request Item not found.'
                );
            }


            const request =
                await SELECT.one
                    .from(PurchaseRequest)
                    .columns('status')
                    .where({
                        ID: item.parent_ID
                    });


            if (
                request &&
                [
                    'Submitted',
                    'Approved',
                    'Rejected',
                    'Cancelled'
                ].includes(request.status)
            ) {

                req.error(
                    400,
                    'Items cannot be deleted after the Purchase Request has been submitted.'
                );
            }
        }
    );


    // ============================================================
    // RULE 10
    // MAXIMUM 20 ITEMS
    // ============================================================

    this.before(
        'CREATE',
        PurchaseRequestItems,
        async (req) => {

            const parentID =
                req.data.parent_ID;


            if (!parentID) {
                return;
            }


            const items =
                await SELECT
                    .from(PurchaseRequestItems)
                    .where({
                        parent_ID: parentID
                    });


            const totalItems =
                items.length + 1;


            if (totalItems > 20) {

                req.error(
                    400,
                    'A Purchase Request cannot contain more than 20 items.'
                );
            }
        }
    );


    // ============================================================
    // RULE 1
    // AT LEAST ONE ITEM BEFORE SUBMISSION
    // ============================================================

    this.on(
        'submitRequest',
        async (req) => {

            const ID =
                req.params[0].ID;


            const request =
                await SELECT.one
                    .from(PurchaseRequest)
                    .where({
                        ID
                    });


            if (!request) {

                return req.error(
                    404,
                    'Purchase Request not found.'
                );
            }


            // Only Draft can be submitted
            if (request.status !== 'Draft') {

                return req.error(
                    400,
                    'Only Draft Purchase Requests can be submitted.'
                );
            }


            // Check items
            const items =
                await SELECT
                    .from(PurchaseRequestItems)
                    .where({
                        parent_ID: ID
                    });


            if (
                !items ||
                items.length === 0
            ) {

                return req.error(
                    400,
                    'At least one item should exist before submitting a Purchase Request.'
                );
            }


            // ----------------------------------------------------
            // Draft → Submitted
            // ----------------------------------------------------

            await UPDATE(PurchaseRequest)
                .set({
                    status: 'Submitted'
                })
                .where({
                    ID
                });


            // ----------------------------------------------------
            // ONLY ONE AUDIT LOG
            // ----------------------------------------------------

            await createAuditLog({

                purchaseRequestID: ID,

                oldStatus: 'Draft',

                newStatus: 'Submitted',

                action: 'SUBMIT',

                user:
                    req.user?.id ||
                    'anonymous'
            });


            return SELECT.one
                .from(PurchaseRequest)
                .where({
                    ID
                });
        }
    );


    // ============================================================
    // APPROVE REQUEST
    // Submitted → Approved
    // ============================================================

    this.on(
        'approveRequest',
        async (req) => {

            const ID =
                req.params[0].ID;


            const request =
                await SELECT.one
                    .from(PurchaseRequest)
                    .where({
                        ID
                    });


            if (!request) {

                return req.error(
                    404,
                    'Purchase Request not found.'
                );
            }


            if (request.status === 'Approved') {

                return req.error(
                    400,
                    'Purchase Request is already approved.'
                );
            }


            if (request.status === 'Rejected') {

                return req.error(
                    400,
                    'Rejected Purchase Requests cannot be approved.'
                );
            }


            if (request.status !== 'Submitted') {

                return req.error(
                    400,
                    'Only Submitted Purchase Requests can be approved.'
                );
            }


            // ----------------------------------------------------
            // Rule 17 - Determine Approver
            // ----------------------------------------------------

            const approver =
                determineApprover(
                    request.totalAmount
                );


            // ----------------------------------------------------
            // Submitted → Approved
            // ----------------------------------------------------

            await UPDATE(PurchaseRequest)
                .set({
                    status: 'Approved',
                    approver: approver
                })
                .where({
                    ID
                });


            // ----------------------------------------------------
            // ONLY ONE AUDIT LOG
            // ----------------------------------------------------

            await createAuditLog({

                purchaseRequestID: ID,

                oldStatus: 'Submitted',

                newStatus: 'Approved',

                action: 'APPROVE',

                user:
                    req.user?.id ||
                    'anonymous'
            });


            return SELECT.one
                .from(PurchaseRequest)
                .where({
                    ID
                });
        }
    );


    // ============================================================
    // REJECT REQUEST
    // Submitted → Rejected
    // ============================================================
    //
    // Rule 18:
    // Rejection comments are mandatory.
    // Minimum 20 characters.
    // ============================================================

    this.on(
        'rejectRequest',
        async (req) => {

            const ID =
                req.params[0].ID;


            const rejectionReason =
                (
                    req.data.rejectionReason ||
                    ''
                ).trim();


            const request =
                await SELECT.one
                    .from(PurchaseRequest)
                    .where({
                        ID
                    });


            if (!request) {

                return req.error(
                    404,
                    'Purchase Request not found.'
                );
            }


            // Approved cannot be rejected
            if (request.status === 'Approved') {

                return req.error(
                    400,
                    'Approved Purchase Requests cannot be rejected.'
                );
            }


            if (request.status === 'Rejected') {

                return req.error(
                    400,
                    'Purchase Request is already rejected.'
                );
            }


            if (request.status !== 'Submitted') {

                return req.error(
                    400,
                    'Only Submitted Purchase Requests can be rejected.'
                );
            }


            // ----------------------------------------------------
            // Rule 18 - Rejection Comment
            // ----------------------------------------------------

            if (
                rejectionReason.length < 20
            ) {

                return req.error(
                    400,
                    'Rejection comments are mandatory and must contain at least 20 characters.'
                );
            }


            // ----------------------------------------------------
            // Submitted → Rejected
            // ----------------------------------------------------

            await UPDATE(PurchaseRequest)
                .set({
                    status: 'Rejected'
                })
                .where({
                    ID
                });


            // ----------------------------------------------------
            // ONLY ONE AUDIT LOG
            // ----------------------------------------------------

            await createAuditLog({

                purchaseRequestID: ID,

                oldStatus: 'Submitted',

                newStatus: 'Rejected',

                action: 'REJECT',

                user:
                    req.user?.id ||
                    'anonymous'
            });


            return SELECT.one
                .from(PurchaseRequest)
                .where({
                    ID
                });
        }
    );


    // ============================================================
    // RULE 20 - CANCEL REQUEST
    // ============================================================
    //
    // Draft → Cancelled
    // Submitted → Cancelled
    //
    // Approved cannot be cancelled.
    // Rejected cannot be cancelled.
    // ============================================================

    this.on(
        'cancelRequest',
        async (req) => {

            const ID =
                req.params[0].ID;


            const request =
                await SELECT.one
                    .from(PurchaseRequest)
                    .where({
                        ID
                    });


            if (!request) {

                return req.error(
                    404,
                    'Purchase Request not found.'
                );
            }


            if (request.status === 'Cancelled') {

                return req.error(
                    400,
                    'Purchase Request is already cancelled.'
                );
            }


            if (request.status === 'Approved') {

                return req.error(
                    400,
                    'Approved Purchase Requests cannot be cancelled.'
                );
            }


            if (request.status === 'Rejected') {

                return req.error(
                    400,
                    'Rejected Purchase Requests cannot be cancelled.'
                );
            }


            if (
                request.status !== 'Draft' &&
                request.status !== 'Submitted'
            ) {

                return req.error(
                    400,
                    'Only Draft or Submitted Purchase Requests can be cancelled.'
                );
            }


            const oldStatus =
                request.status;


            // ----------------------------------------------------
            // Draft / Submitted → Cancelled
            // ----------------------------------------------------

            await UPDATE(PurchaseRequest)
                .set({
                    status: 'Cancelled'
                })
                .where({
                    ID
                });


            // ----------------------------------------------------
            // ONLY ONE AUDIT LOG
            // ----------------------------------------------------

            await createAuditLog({

                purchaseRequestID: ID,

                oldStatus: oldStatus,

                newStatus: 'Cancelled',

                action: 'CANCEL',

                user:
                    req.user?.id ||
                    'anonymous'
            });


            return SELECT.one
                .from(PurchaseRequest)
                .where({
                    ID
                });
        }
    );


    // ============================================================
    // RULE 28 - DRAFT EXPIRY
    // ============================================================
    //
    // Draft requests older than 30 days become Expired.
    // ============================================================

    async function expireOldDrafts() {

        const cutoff =
            new Date();

        cutoff.setDate(
            cutoff.getDate() - 30
        );


        const drafts =
            await SELECT
                .from(PurchaseRequest)
                .where({
                    status: 'Draft'
                });


        let expiredCount = 0;


        for (const request of drafts) {

            if (
                request.createdAt &&
                new Date(request.createdAt) <= cutoff
            ) {

                await UPDATE(PurchaseRequest)
                    .set({
                        status: 'Expired'
                    })
                    .where({
                        ID: request.ID
                    });


                // ------------------------------------------------
                // Notification
                // ------------------------------------------------

                await INSERT.into(
                    Notifications
                ).entries({

                    purchaseRequest_ID:
                        request.ID,

                    recipient:
                        request.requesterName ||
                        'User',

                    message:
                        'Purchase Request has expired because it remained in Draft status for more than 30 days.',

                    status:
                        'Unread',

                    createdDate:
                        new Date()
                });


                // ------------------------------------------------
                // Audit log for expiry
                // ------------------------------------------------

                await createAuditLog({

                    purchaseRequestID:
                        request.ID,

                    oldStatus:
                        'Draft',

                    newStatus:
                        'Expired',

                    action:
                        'EXPIRE',

                    user:
                        'System'
                });


                expiredCount++;
            }
        }


        return expiredCount;
    }


    // ============================================================
    // EXPOSE EXPIRE OLD DRAFTS ACTION
    // ============================================================

    this.on(
        'expireOldDrafts',
        async () => {

            const count =
                await expireOldDrafts();

            return `${count} draft request(s) expired.`;
        }
    );


    // ============================================================
    // AUTOMATIC DRAFT EXPIRY CHECK
    // ============================================================
    //
    // Runs once when the service starts and then once every
    // 24 hours.
    // ============================================================

    cds.on(
        'served',
        () => {

            expireOldDrafts()
                .catch(error => {
                    console.error(
                        'Error while expiring old drafts:',
                        error
                    );
                });


            setInterval(
                () => {

                    expireOldDrafts()
                        .catch(error => {

                            console.error(
                                'Error while expiring old drafts:',
                                error
                            );
                        });

                },
                24 * 60 * 60 * 1000
            );
        }
    );

});