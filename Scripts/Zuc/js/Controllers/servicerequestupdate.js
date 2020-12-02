/*

    servicerequestupdate Controller for the View "servicerequestupdate"
    Copyright 2020, LimeTAC Inc. All rights reserved.

*/

(function () {

    var U = new LTPublicUtils();
    var searchKey;

    var conversationTypeId = 2; //(public)
    var eventTypeActivityId = 1125; //(Service Request Update) 1125 is PROD, 1107 is DEV

    $('#field-sr-number').keypress(
        function (event) {
            if (event.which == '13') {
                event.preventDefault();
            }
        });

    function ShowThanks() {
        var thanksSection = document.getElementById("thanks-section");
        var formContent = document.getElementById("frm-content");
        var styleName = "non-visible";

        thanksSection.className = thanksSection.className.replace(/\bnon-visible\b/g, "");

        var arr;

        arr = formContent.className.split(" ");
        if (arr.indexOf(styleName) == -1) {
            formContent.className += " " + styleName;
        }
    }

    function SendComments(val) {

        var Data = { text: val };
        U.AJAX('/API/Core/CreateConversationForEventsForCurrentUser/' + searchKey + '/' + eventTypeActivityId + '/' + conversationTypeId + '/' + true, 'POST', Data, false, 'splash', true).then(function() {

            ShowThanks();
        });
    }

    $('form#service-request-update').on('submit', function (E) {

        E.preventDefault();

        var inquiry = document.getElementById("field-description").value;

        if (inquiry.length > 0) {

            SendComments(inquiry);
        }
    });

    document.getElementById("search-button").onclick = function () {

        var cceNumber = document.getElementById("field-sr-number").value;

        if (cceNumber <= 0) {
            var srInput = document.getElementById("field-sr-number");

            srInput.style.boxShadow ='0 0 4px 1px red';
            srInput.style.backgroundColor='#ffe0e0' ; 

            
        } else {
            U.AJAX('/API/Core/GetAffiliateFullNameByCCENumber/' + cceNumber, 'GET', false, false, 'splash')
                .then(function (Result) {

                    if (Result) {
                        document.getElementById("SR-number-fullName").innerHTML = Result["fullName"];

                        searchKey = Result["searchKey"];

                        document.getElementById("field-description").disabled = false;
                        document.getElementById("field-sr-number").disabled = true;

                        $('.inquiry-container').removeClass('non-visible');
                        $('.inquiry-mainButtons').removeClass('non-visible');

                    } else {

                        var messageLabel = document.getElementById("SR-number-fullName");

                        messageLabel.innerHTML = "Service Request Not Found.";

                        var temp_link = document.createElement("a");
                        temp_link.href = "/Zuc/formservicerequest";
                        temp_link.style.color = 'red';
                        temp_link.style.fontWeight = 'bold';
                        temp_link.target = '_self';
                        temp_link.innerHTML = "Create a NEW Service Reqest";


                        var par = document.createElement("p");
                        par.innerHTML = "Verify your request number or ";
                        par.appendChild(temp_link);

                        document.getElementById("SR-number-fullName").appendChild(par);

                        //<p style="color:red; font-weight:bold; text-align:center; font-size:x-large;">
                        //    Do you have an existing Service Request? <span style="font-style:italic;"><a href="/Zuc/servicerequestupdate" title="Click Here">Click Here</a></span>
                        //</p>

                    }
                });
        }
    }

    document.getElementById("done-button").onclick = function () {

        location.href = "/Zuc/Index";
    }

    document.getElementById("back-button").onclick = function () {

        location.href = "/Zuc/formservicerequest";
    }

    document.getElementById("field-sr-number").onclick = function () {

        var e = document.getElementById("field-sr-number")

        e.style.backgroundColor = 'initial';
    }

})();