namespace purchase.request;

using { cuid, managed } from '@sap/cds/common';




entity PurchaseRequest : cuid, managed {

    purchaseRequestNo : String(20);

    requesterName     : String(100);

    department        : String(50);

    requestDate       : Date;

    currency          : String(3) default 'INR';

    totalAmount       : Decimal(15, 2) default 0.00;

    status            : String(20) default 'Draft';

    
    approver          : String(100);

    
    rejectionReason   : String(500);

    items : Composition of many PurchaseRequestItems
            on items.parent = $self;

    
    auditLogs : Composition of many AuditLogs
                on auditLogs.purchaseRequest = $self;
}




entity PurchaseRequestItems : cuid, managed {

    parent         : Association to PurchaseRequest;

    materialNumber : String(40);

    description    : String(255);

    quantity       : Integer;

    unitPrice      : Decimal(15, 2);

    netAmount      : Decimal(15, 2);

    tax            : Decimal(15, 2);

    grossAmount    : Decimal(15, 2);

    totalPrice     : Decimal(15, 2);
}




entity Notifications : cuid {

    purchaseRequest_ID : UUID;

    recipient          : String(100);

    message            : String(500);

    status             : String(20) default 'Unread';

    createdDate        : Timestamp;
}


entity AuditLogs : cuid, managed {

    purchaseRequest : Association to PurchaseRequest;

    oldStatus       : String(20);

    newStatus       : String(20);

    user            : String(100);

    timestamp       : Timestamp;

    action          :  String(10)


}