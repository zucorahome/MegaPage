/*

    formcontactus Controller for the View "formcontactus"
    Copyright 2020, LimeTAC Inc. All rights reserved.

*/

(function () {

    var U = new LTPublicUtils();

    var Form = $('form#contact-us');
    var Widgets = {
        Name: Form.find('#field-name'),
        Email: Form.find('#field-email'),
        Phone: Form.find('#field-phone'),
        Message: Form.find('#field-message'),
    };

    Form.on('submit', function (E) {
        E.preventDefault();
        try {
            var Data = {
                Name: Widgets.Name.val().trim(),
                Email: Widgets.Email.val().trim(),
                Phone: Widgets.Phone.val().replace(/[^0-9]/g, ''),
                Message: Widgets.Message.val().trim(),
            };
            if (Data.Name.length < 2) {
                Widgets.Name.select();
                throw new Error('First & Last Name');
            } else if (Data.Email.length < 3) {
                Widgets.Email.select();
                throw new Error('Email Address');
            } else if (Data.Phone.length < 10 || Data.Phone.length > 11) {
                Widgets.Phone.select();
                throw new Error('Phone Number');
            } else if (Data.Message.length < 1) {
                Widgets.Message.select();
                throw new Error('Message');
            }
            U.AJAX(
                '/api/Notification/SendNotificationThirdParty', 'POST',
                {
                    AlertName: 'FormContactUs',
                    AffiliateId: -1,
                    TemplateData: JSON.stringify(Data)
                },
                false, 'normal', true
            ).then(function () {
                $('section.zuc-contact-us-container').hide();
                $('section.zuc-request-confirmation').show();
            });
        } catch (ex) {
            U.Alert({ Message: 'Please fill in ' + ex.message + '.' });
        }
    });

})();