/*

    statementofaccount Controller for the View "statementofaccount"
    Copyright 2020, LimeTAC Inc. All rights reserved.

*/

(function () {

    var U = new LTPublicUtils();
    var CurrentYear = new Date().getFullYear();

    $.when(
        U.AJAX('/API/Core/GetRetailerDatas', 'GET', false, false, 'silent').then(R => R),
    ).done(function (RetailerData) {

        $(function () {

            var Widgets = {};
            Widgets.RegistrationHistoryData = null;

            Widgets.FromDate = $('#sa-from-date');
            Widgets.ToDate = $('#sa-to-date');
            Widgets.FilterButton = $('.filterConditions-query-button');

            Widgets.StatementOfAccountTable = $('.sa-state-of-account');// registration Plan Table


            Widgets.Init = function () {

               
            }();


            Widgets.FilterButton.on('click', function () {
                Widgets.FilterStatementOfAccounts();
            });

            Widgets.FilterStatementOfAccounts = function () {

                let filter = 'Count=100'
                filter += Widgets.FromDate.val() ? `&FromDate=${Widgets.FromDate.val()}` : '';
                filter += Widgets.ToDate.val() ? `&ToDate=${Widgets.ToDate.val()}` : '';


                U.AJAX(`/API/SalesOrderManagement/v1/GetOrders?${filter}`, 'GET', false, false, 'silent').then(R => {
                    Widgets.RegistrationHistoryData = R;
                    Widgets.RenderData();
                });
            }

            Widgets.RenderData = function () {
                $(".new-planAdd-detail").show();
                var TBody = Widgets.StatementOfAccountTable.find(`tbody`);
                TBody.find('tr').remove();
                var RowHTML = "";
                if (Widgets.RegistrationHistoryData && Widgets.RegistrationHistoryData.statementOfAccounts && Widgets.RegistrationHistoryData.statementOfAccounts.length > 0) {
                    Widgets.RegistrationHistoryData.statementOfAccounts.forEach(Data => {
                        RowHTML += `<tr class="new-itemAdd" data-lt-model="${encodeURIComponent(JSON.stringify(Data))}" data-lt-id="" >
                            <td data-label="TransactionDescription">${Data.transactionDescription || ''}</td>
                            <td data-label="TransactionTime">${Data.transactionTime ? Data.transactionTime.substring(0, 10) : undefined || ''}</td>
                            <td data-label="DueDate">${Data.dueDate ? Data.dueDate.substring(0, 10) : undefined || ''}</td>
                            <td data-label="Amount">$${Data.amount.toFixed(2)}</td>
                            <td data-label="Balance">$${Data.balance.toFixed(2)}</td>
                        </tr>`;
                    });
                }
                $(RowHTML).appendTo(TBody); // add
            };

            U.ShowUI();

        });
    });

})();