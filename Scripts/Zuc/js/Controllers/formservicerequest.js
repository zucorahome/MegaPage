﻿/*

    formservicerequest Controller for the View "formservicerequest"
    Copyright 2019, LimeTAC Inc. All rights reserved.

*/

(function () {

    var U = new LTPublicUtils();

    $('form#service-request').on('submit', function (E) {

        E.preventDefault();

        var Form = $(this);

        // gather the data
        var Data = {
            FirstName: Form.find('#field-first-name').val().trim(),
            LastName: Form.find('#field-last-name').val().trim(),
            Email: Form.find('#field-email').val().trim(),
            CurrentPhone: Form.find('#field-current-phone').val().trim(),
            PhoneNumber: Form.find('#field-order-phone').val().trim(),
            StreetAddress: Form.find('#field-address').val().trim(),
            City: Form.find('#field-city').val().trim(),
            Province: Form.find('#field-province').val(),
            PostalCode: Form.find('#field-postal').val().trim(),
            Retailer: Form.find('#field-retailer').val().trim(),
            ProductType: null, // Form.find('#field-product-type').val(),
            SpecificItem: Form.find('#field-item').val().trim(),
            DatePurchased: Form.find('#field-purchase-date').val().trim(),
            OrderId: Form.find('#field-order-id').val().trim(),
            DescriptionOfIssue: Form.find('#field-description').val().trim(),
            IssueHappen: Form.find('#field-how').val().trim(),
            Language: 'EN',
            IssueOccurredDate: Form.find('#field-when').val().trim(),
            IsTryToCorrecting:
                Form.find('[name="effort"]:checked').length
                    ? Form.find('[name="effort"]:checked').val() == 'Yes'
                    : null,
            UploadLink: null,
        };
        Data['FullName'] = (Data.FirstName + ' ' + Data.LastName).substr(0, 44) + ' ' + U.GetRandomString(5);

        // enough data to submit?
        if (Data.FirstName && Data.LastName && Data.Email && Data.CurrentPhone && Data.Province/* && Data.ProductType*/ && Data.DescriptionOfIssue) {

            U.LoadingSplash.Show();

            // upload any attachments
            var Upload = new $.Deferred();
            var FileInput = $('#field-files');
            if (window.File && window.FormData && FileInput[0].files.length) {
                var Files = FileInput[0].files;
                var Attachments = new FormData();
                for (var I = 0; I < Files.length; I++) {
                    Attachments.append('File' + I, Files[I]);
                }
                U.AJAX('/API/FieldService/UploadServiceRequestFile', 'POST', Attachments, false, 'silent', false, { contentType: false, processData: false })
                    .done(function (Links) { Upload.resolve(Links); });
            } else {
                Upload.resolve([]);
            }

            Upload
                // send the data form the form
                .then(function (Links) {
                    Data.UploadLink = Links;
                    return U.AJAX('/API/FieldService/CreateServiceRequest', 'POST', Data, false, 'silent');
                })
                // confirm form submission
                .then(function () {
                    U.LoadingSplash.Hide();
                    $('section.zuc-service-form').hide();
                    $('section.zuc-request-confirmation').show();
                });

        } else {

            U.Alert({ Message: 'Please complete all required fields (fields marked with an "*") before submitting the form.' });

        }

    });

})();