using { purchase.request as my } from '../db/schema';

service PurchaseService {
    @odata.draft.enabled
    entity PurchaseRequest as projection on my.PurchaseRequest actions {
        action submitRequest()  returns PurchaseRequest;
        action approveRequest() returns PurchaseRequest;
        action rejectRequest()  returns PurchaseRequest;
        action cancelRequest()  returns PurchaseRequest;
    };

    entity PurchaseRequestItems as projection on my.PurchaseRequestItems;
    entity Notifications        as projection on my.Notifications;

    action expireOldDrafts() returns String;
}