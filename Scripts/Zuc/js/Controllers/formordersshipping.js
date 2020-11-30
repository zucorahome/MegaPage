/*

    formordersshipping Controller for the View "formordersshipping"
    Copyright 2020, LimeTAC Inc. All rights reserved.

*/

(function () {

    var U = new LTPublicUtils();

    var Form = $('form#orders-and-returns');
    var Widgets = {
        OrderNumber: Form.find('#field-order-number'),
        LastName: Form.find('#field-last-name'),
        PostalCode: Form.find('#field-postal-code'),
        Email: Form.find('#field-email'),
        OrderInfo: Form.find('#field-order-info'),
    };

    Form.on('submit', function (E) {
        E.preventDefault();
        try {
            var Data = {
                OrderNumber: Widgets.OrderNumber.val().trim(),
                LastName: Widgets.LastName.val().trim(),
                PostalCode: Widgets.PostalCode.val().trim(),
                Email: Widgets.Email.val().trim(),
                OrderInfo: Widgets.OrderInfo.val().trim(),
            };
            if (!Data.OrderNumber.length) {
                Widgets.OrderNumber.select();
                throw new Error(Widgets.OrderNumber.siblings('label').text());
            } else if (!Data.LastName.length) {
                Widgets.LastName.select();
                throw new Error(Widgets.LastName.siblings('label').text());
            } else if (Data.PostalCode.length < 3) {
                Widgets.PostalCode.select();
                throw new Error(Widgets.PostalCode.siblings('label').text());
            } else if (Data.Email.length < 3) {
                Widgets.Email.select();
                throw new Error(Widgets.Email.siblings('label').text());
            } else if (!Data.OrderInfo.length) {
                Widgets.OrderInfo.select();
                throw new Error(Widgets.OrderInfo.siblings('label').text());
            }
            U.AJAX(
                '/api/Notification/SendNotificationThirdParty', 'POST',
                {
                    AlertName: 'FormOrdersAndReturns',
                    AffiliateId: -1,
                    TemplateData: JSON.stringify(Data)
                },
                false, 'normal', true
            ).then(function () {
                $('section.zuc-orders-section').hide();
                $('section.zuc-request-confirmation').show();
            });
        } catch (ex) {
            U.Alert({ Message: 'Please fill in ' + ex.message + '.' });
        }
    });

})();