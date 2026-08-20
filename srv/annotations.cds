using PurchaseService as service from './purchase-service';


// ============================================================
// STANDARD FIELD LABELS - PURCHASE REQUEST
// ============================================================

annotate service.PurchaseRequest with {

    purchaseRequestNo @Common.Label : 'Purchase Request Number';
    requesterName     @Common.Label : 'Requester Name';
    department        @Common.Label : 'Department';
    requestDate       @Common.Label : 'Request Date';
    currency          @Common.Label : 'Currency';
    totalAmount       @Common.Label : 'Total Amount';
    status            @Common.Label : 'Status';
    approver          @Common.Label : 'Approver';

};


// ============================================================
// STANDARD FIELD LABELS - PURCHASE REQUEST ITEMS
// ============================================================

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


// ============================================================
// STANDARD FIELD LABELS - AUDIT LOGS
// ============================================================

annotate service.AuditLogs with {

    oldStatus @Common.Label : 'Old Status';
    newStatus @Common.Label : 'New Status';
    user      @Common.Label : 'User';
    timestamp @Common.Label : 'Timestamp';
    action    @Common.Label : 'Action';

};


// ============================================================
// FIELD CONTROLS - PURCHASE REQUEST
// ============================================================

annotate service.PurchaseRequest with {

    // Automatically generated
    purchaseRequestNo @Common.FieldControl : #ReadOnly;

    // Automatically calculated
    totalAmount @Common.FieldControl : #ReadOnly;

    // Controlled by actions
    status @Common.FieldControl : #ReadOnly;

    // Automatically determined by Approval Matrix
    approver @Common.FieldControl : #ReadOnly;

};


// ============================================================
// FIELD CONTROLS - PURCHASE REQUEST ITEMS
// ============================================================

annotate service.PurchaseRequestItems with {

    // Automatically calculated
    netAmount   @Common.FieldControl : #ReadOnly;
    tax         @Common.FieldControl : #ReadOnly;
    grossAmount @Common.FieldControl : #ReadOnly;
    totalPrice  @Common.FieldControl : #ReadOnly;

};


// ============================================================
// SIDE EFFECTS - REFRESH HEADER WHEN ITEMS CHANGE
// ============================================================

annotate service.PurchaseRequest with @(
    Common.SideEffects #ItemChanged : {

        SourceEntities : [
            items
        ],

        TargetProperties : [
            'totalAmount',
            'approver'
        ]

    }
);


// ============================================================
// PURCHASE REQUEST - UI
// ============================================================

annotate service.PurchaseRequest with @(UI: {


    // --------------------------------------------------------
    // LIST REPORT LINE ITEM
    // --------------------------------------------------------

    LineItem : [

        {
            $Type : 'UI.DataField',
            Value : purchaseRequestNo,
            Label : 'Purchase Request No'
        },
        {
            $Type : 'UI.DataField',
            Value : department,
            Label : 'Department'
        },

        {
            $Type : 'UI.DataField',
            Value : requestDate,
            Label : 'Request Date'
        },

        {
            $Type : 'UI.DataField',
            Value : status,
            Label : 'Status'
        },

        {
            $Type : 'UI.DataField',
            Value : totalAmount,
            Label : 'Total Amount'
        },

        {
            $Type : 'UI.DataField',
            Value : approver,
            Label : 'Approver'
        }

    ],


    // --------------------------------------------------------
    // OBJECT PAGE FACETS
    // --------------------------------------------------------

    Facets : [

        {
            $Type  : 'UI.ReferenceFacet',
            ID     : 'GeneralInformationFacet',
            Label  : 'General Information',
            Target : '@UI.FieldGroup#GeneralInformation'
        },

        {
            $Type  : 'UI.ReferenceFacet',
            ID     : 'PurchaseItemsFacet',
            Label  : 'Purchase Items',
            Target : 'items/@UI.LineItem'
        },

        {
            $Type  : 'UI.ReferenceFacet',
            ID     : 'AuditHistoryFacet',
            Label  : 'Status History',
            Target : 'auditLogs/@UI.LineItem'
        }

    ],


    // --------------------------------------------------------
    // GENERAL INFORMATION
    // --------------------------------------------------------

    FieldGroup #GeneralInformation : {

        Data : [

            {
                $Type : 'UI.DataField',
                Value : purchaseRequestNo,
                Label : 'Purchase Request No'
            },
            {
                $Type : 'UI.DataField',
                Value : department,
                Label : 'Department'
            },

            {
                $Type : 'UI.DataField',
                Value : requestDate,
                Label : 'Request Date'
            },

            {
                $Type : 'UI.DataField',
                Value : status,
                Label : 'Status'
            },

            {
                $Type : 'UI.DataField',
                Value : totalAmount,
                Label : 'Total Amount'
            },

            {
                $Type : 'UI.DataField',
                Value : approver,
                Label : 'Approver'
            }

        ]

    },


    // --------------------------------------------------------
    // PURCHASE REQUEST ACTIONS
    // --------------------------------------------------------

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


// ============================================================
// PURCHASE REQUEST ITEMS - UI
// ============================================================

annotate service.PurchaseRequestItems with @(UI: {


    // --------------------------------------------------------
    // ITEM LINE ITEM
    // --------------------------------------------------------

    LineItem : [

        {
            $Type : 'UI.DataField',
            Value : materialNumber,
            Label : 'Material Number'
        },

        {
            $Type : 'UI.DataField',
            Value : description,
            Label : 'Description'
        },

        {
            $Type : 'UI.DataField',
            Value : quantity,
            Label : 'Quantity'
        },

        {
            $Type : 'UI.DataField',
            Value : unitPrice,
            Label : 'Unit Price'
        },

        {
            $Type : 'UI.DataField',
            Value : netAmount,
            Label : 'Net Amount'
        },

        {
            $Type : 'UI.DataField',
            Value : tax,
            Label : 'Tax (18%)'
        },

        {
            $Type : 'UI.DataField',
            Value : grossAmount,
            Label : 'Gross Amount'
        },

        {
            $Type : 'UI.DataField',
            Value : totalPrice,
            Label : 'Total Price'
        }

    ],


    // --------------------------------------------------------
    // ITEM FACET
    // --------------------------------------------------------

    Facets : [

        {
            $Type  : 'UI.ReferenceFacet',
            ID     : 'ItemGeneralInformationFacet',
            Label  : 'General Information',
            Target : '@UI.FieldGroup#General'
        }

    ],


    // --------------------------------------------------------
    // ITEM GENERAL INFORMATION
    // --------------------------------------------------------

    FieldGroup #General : {

        Data : [

            {
                $Type : 'UI.DataField',
                Value : materialNumber,
                Label : 'Material Number'
            },

            {
                $Type : 'UI.DataField',
                Value : description,
                Label : 'Description'
            },

            {
                $Type : 'UI.DataField',
                Value : quantity,
                Label : 'Quantity'
            },

            {
                $Type : 'UI.DataField',
                Value : unitPrice,
                Label : 'Unit Price'
            },

            {
                $Type : 'UI.DataField',
                Value : netAmount,
                Label : 'Net Amount'
            },

            {
                $Type : 'UI.DataField',
                Value : tax,
                Label : 'Tax (18%)'
            },

            {
                $Type : 'UI.DataField',
                Value : grossAmount,
                Label : 'Gross Amount'
            },

            {
                $Type : 'UI.DataField',
                Value : totalPrice,
                Label : 'Total Price'
            }

        ]

    }

});


// ============================================================
// AUDIT LOGS - UI
// ============================================================

annotate service.AuditLogs with @(UI: {


    // --------------------------------------------------------
    // AUDIT LOG LINE ITEM
    // --------------------------------------------------------

    LineItem : [

        {
            $Type : 'UI.DataField',
            Value : action,
            Label : 'Action'
        },

        {
            $Type : 'UI.DataField',
            Value : oldStatus,
            Label : 'Old Status'
        },

        {
            $Type : 'UI.DataField',
            Value : newStatus,
            Label : 'New Status'
        },

        {
            $Type : 'UI.DataField',
            Value : user,
            Label : 'User'
        },

        {
            $Type : 'UI.DataField',
            Value : timestamp,
            Label : 'Timestamp'
        }

    ]

});


// ============================================================
// NOTIFICATIONS - UI
// ============================================================

annotate service.Notifications with @(UI: {

    LineItem : [

        {
            $Type : 'UI.DataField',
            Value : recipient,
            Label : 'Recipient'
        },

        {
            $Type : 'UI.DataField',
            Value : message,
            Label : 'Message'
        },

        {
            $Type : 'UI.DataField',
            Value : status,
            Label : 'Status'
        },

        {
            $Type : 'UI.DataField',
            Value : createdDate,
            Label : 'Created Date'
        }

    ]

});