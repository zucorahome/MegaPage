/*

    buyinggroupreview Controller for the View "buyinggroupreview"
    Copyright 2020, LimeTAC Inc. All rights reserved.

*/

(function () {

    var U = new LTPublicUtils();

    var SOEventId = U.GetURIParam('eId') || null;
    if (!U.IsNumber(SOEventId)) SOEventId = null;
    var EventItemIds = U.GetURIParam('eIIds');
    if (!EventItemIds) {
        EventItemIds = [];
    } else {
        EventItemIds = EventItemIds.split(',');
        for (var I = 0; I < EventItemIds.length; I++) {
            if (!U.IsNumber(EventItemIds[I])) {
                EventItemIds = [];
                break;
            }
        }
    }
    var ShipViaId = U.GetURIParam('sVId') || null;
    if (!U.IsNumber(ShipViaId)) ShipViaId = null;
    var Approve = U.GetURIParam('a');
    if (Approve === '1' || Approve === '0') {
        Approve = Approve === '1';
    } else {
        Approve = null;
    }

    $(function () {
        function ShowFailure(JQXHR, Status, Err) {
            $('#failed-message')
                .show()
                .find('.message')
                .text(
                    (JQXHR && JQXHR.responseJSON && JQXHR.responseJSON.message)
                    || 'Please try again soon.'
                );
        }
        function DoApproval(Reference) {
            return U.AJAX('/api/Inventory/ReserveAndAddNewEventItemsToPickList/' + SOEventId + '/' + EventItemIds.join(',') + '/' + ShipViaId + '?reference=' + encodeURIComponent(Reference), 'POST')
                .then(
                    function () {
                        $('#approval-container').hide();
                        $('#approved-message').show();
                    },
                    ShowFailure
                );
        }
        if (!SOEventId || !EventItemIds.length || !ShipViaId || Approve === null) {
            ShowFailure({ responseJSON: { message: 'Malformed URL' } });
        } else if (!Approve) {
            $('#rejected-message').show();
        } else {
            $('#approval-container').show();
            var RefField = $('#reference');
            $('#approve').on('click', function () {
                var Ref = RefField.val().trim();
                if (Ref.length) {
                    DoApproval(Ref);
                } else {
                    RefField.select();
                }
            });
        }

        U.ShowUI();
    });

})();