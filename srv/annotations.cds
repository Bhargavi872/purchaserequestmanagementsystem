using PurchaseService as service from './purchase-service';

// Standard Field Labels
annotate service.PurchaseRequest with {
    purchaseRequestNo @Common.Label : 'Purchase Request Number';
    requesterName     @Common.Label : 'Requester Name';
    department        @Common.Label : 'Department';
    requestDate       @Common.Label : 'Request Date';
    currency          @Common.Label : 'Currency';
    totalAmount       @Common.Label : 'Total Amount';
    status            @Common.Label : 'Status';
};

annotate service.PurchaseRequestItems with {
    materialNumber @Common.Label : 'Material Number';
    description    @Common.Label : 'Description';
    quantity       @Common.Label : 'Quantity';
    unitPrice      @Common.Label : 'Unit Price';
    netAmount      @Common.Label : 'Net Amount';
    tax            @Common.Label : 'Tax (18%)';
    grossAmount    @Common.Label : 'Gross Amount';
    totalPrice     @Common.Label : 'Total Price';
};

// Field Controls
annotate service.PurchaseRequest with {
    purchaseRequestNo @Common.FieldControl : #ReadOnly;
    totalAmount       @Common.FieldControl : #ReadOnly;
    status            @Common.FieldControl : #ReadOnly;
};

annotate service.PurchaseRequestItems with {
    netAmount   @Common.FieldControl : #ReadOnly;
    tax         @Common.FieldControl : #ReadOnly;
    grossAmount @Common.FieldControl : #ReadOnly;
    totalPrice  @Common.FieldControl : #ReadOnly;
};

// Side Effects for UI Auto-refresh
annotate service.PurchaseRequest with @(
    Common.SideEffects #ItemChanged : {
        SourceEntities : [items],
        TargetProperties : ['totalAmount']
    }
);

// UI Layout Layouts
annotate service.PurchaseRequest with @(UI: {

    LineItem : [
        { Value : purchaseRequestNo },
        { Value : requesterName },
        { Value : department },
        { Value : requestDate },
        { Value : currency },
        { Value : totalAmount },
        { Value : status }
    ],

    Facets : [
        {
            $Type  : 'UI.ReferenceFacet',
            Label  : 'General Information',
            Target : '@UI.FieldGroup#General'
        },
        {
            $Type  : 'UI.ReferenceFacet',
            Label  : 'Purchase Items',
            Target : 'items/@UI.LineItem'
        }
    ],

    FieldGroup #General : {
        Data : [
            { Value : purchaseRequestNo },
            { Value : requesterName },
            { Value : department },
            { Value : requestDate },
            { Value : currency },
            { Value : totalAmount },
            { Value : status }
        ]
    },

    Identification : [
        {
            $Type  : 'UI.DataFieldForAction',
            Action : 'PurchaseService.submitRequest',
            Label  : 'Submit'
        },
        {
            $Type  : 'UI.DataFieldForAction',
            Action : 'PurchaseService.approveRequest',
            Label  : 'Approve'
        },
        {
            $Type  : 'UI.DataFieldForAction',
            Action : 'PurchaseService.rejectRequest',
            Label  : 'Reject'
        },
        {
            $Type  : 'UI.DataFieldForAction',
            Action : 'PurchaseService.cancelRequest',
            Label  : 'Cancel'
        }
    ]
});

annotate service.PurchaseRequestItems with @(UI: {

    LineItem : [
        { Value : materialNumber },
        { Value : description },
        { Value : quantity },
        { Value : unitPrice },
        { Value : netAmount },
        { Value : tax },
        { Value : grossAmount },
        { Value : totalPrice }
    ],

    Facets : [
        {
            $Type  : 'UI.ReferenceFacet',
            Label  : 'General Information',
            Target : '@UI.FieldGroup#General'
        }
    ],

    FieldGroup #General : {
        Data : [
            { Value : materialNumber },
            { Value : description },
            { Value : quantity },
            { Value : unitPrice },
            { Value : netAmount },
            { Value : tax },
            { Value : grossAmount },
            { Value : totalPrice }
        ]
    }
});