using {purchase.request as my} from '../db/schema';

service PurchaseService {

    @odata.draft.enabled
    entity PurchaseRequest      as projection on my.PurchaseRequest
        actions {

            action submitRequest()                        returns PurchaseRequest;

            action approveRequest()                       returns PurchaseRequest;

            action rejectRequest(rejectionReason: String) returns PurchaseRequest;

            action cancelRequest()                        returns PurchaseRequest;
        };

    entity PurchaseRequestItems as projection on my.PurchaseRequestItems;
    entity Notifications        as projection on my.Notifications;
    entity AuditLogs            as projection on my.AuditLogs;
    action expireOldDrafts() returns String;
}
