annotate service.PurchaseRequest with @(UI:
 { HeaderInfo : { 
    TypeName : 'Purchase Request',
    TypeNamePlural : 'Purchase Requests',
    Title : { Value : purchaseRequestNo }, 
    Description : { Value : requesterName }
 },
 LineItem : [ {
     Value : purchaseRequestNo,
      Label : 'purchaseRequestNo' }, 
      { Value : requesterName }, 
      { Value : department }, 
      { Value : requestDate },
       { Value : currency },
        { Value : totalAmount },
         { Value : status } ],

Facets : [
     { $Type : 'UI.ReferenceFacet', 
     Label : 'General Information', 
     Target : '@UI.FieldGroup#General' }, 
     { $Type : 'UI.ReferenceFacet',
     Label : 'Purchase Items',
     Target : 'items/@UI.LineItem' } ],

     FieldGroup #General : {
         Data : [ { 
            Value : purchaseRequestNo,
             Label : 'Purchase Request Number' },
              { Value : requesterName,
               Label : 'Requester Name' },

    { Value : department,
     Label : 'Department' },
     
   { Value : requestDate, 
   Label : 'Request Date' },
   { Value : currency, 
   Label : 'Currency' },
   { Value : totalAmount,
    Label : 'Total Amount' }, 
   { Value : status,
     Label : 'Status' } 
     ] 
     } 
     });
   annotate service.PurchaseRequestItems with @(UI:
    { LineItem : [
       { Value : materialNumber },
        { Value : description }, 
        { Value : quantity }, 
        { Value : unitPrice }, 
        { Value : totalPrice } 
        ],

        Facets : [ 
         { 
            $Type : 'UI.ReferenceFacet', 
            Label : 'Item Details',
            Target : '@UI.FieldGroup#General' } 
            ],
      FieldGroup #General :
       { Data : [
          {
             Value : purchaseRequestNo,
             Label : 'Purchase Request Number' }, 
             { 
               Value : requesterName,
               Label : 'Requester Name' },
               { Value : department, 
               Label : 'Department' }, 
               { Value : requestDate, 
               Label : 'Request Date' },
                { Value : currency,
                 Label : 'Currency' },

                 { Value : totalAmount,
                  Label : 'Total Amount' },
                  
                  
                   { Value : status, 
                   Label : 'Status' } 
                   ] 
                   } 
                   });






   