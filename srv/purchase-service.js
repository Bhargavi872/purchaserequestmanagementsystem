const cds = require('@sap/cds');

module.exports = cds.service.impl(async function () {

    this.before('CREATE', 'PurchaseRequest', async (req) => {

        const year = new Date().getFullYear();

        let nextNumber = 1;

        const lastRequest = await SELECT.one
            .from('PurchaseService.PurchaseRequest')
            .columns('purchaseRequestNo')
            .where({
                purchaseRequestNo: { like: `PR-${year}-%` }
            });

        if (lastRequest?.purchaseRequestNo) {

            const lastNumber = parseInt(
                lastRequest.purchaseRequestNo.split('-')[2],
                10
            );

            nextNumber = lastNumber + 1;
        }

        req.data.purchaseRequestNo =
            `PR-${year}-${String(nextNumber).padStart(6, '0')}`;

    });

});