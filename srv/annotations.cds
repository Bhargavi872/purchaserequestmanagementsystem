using purchase.request as db from '../db/schema';
 service PurchaseService { 
    @odata.draft.enabled
     entity PurchaseRequest as projection on db.PurchaseRequest actions {
         action submitRequest(); 
         action approveRequest(); 
         action rejectRequest(); };
         entity PurchaseRequestItems as projection on db.PurchaseRequestItem; }