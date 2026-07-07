namespace purchase.request; 
using { managed } from '@sap/cds/common'; 
type RequestStatus : String enum { 
    Draft; 
    Submitted;
     Approved;
      Rejected; } 
entity PurchaseRequest : managed { 
    key purchaseRequestNo : String(20); 
    requesterName : String(100); 
    department : String(50);
    requestDate : Date;
    currency : String(3); 
    totalAmount : Decimal(15,2);
    status : RequestStatus;
    items : Composition of many PurchaseRequestItem on items.purchaseRequest = $self; 
    }
    entity PurchaseRequestItem : managed {
         key ID : UUID; 
         materialNumber : String(30);
          description : String(255); 
          quantity : Integer; 
          unitPrice : Decimal(15,2); 
          totalPrice : Decimal(15,2); 
          purchaseRequest : Association to PurchaseRequest; }