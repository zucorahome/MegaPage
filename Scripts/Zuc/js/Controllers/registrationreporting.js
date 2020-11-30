/*

    registrationreporting Controller for the View "registrationreporting"
    Copyright 2020, LimeTAC Inc. All rights reserved.

*/

(function () {

    var U = new LTPublicUtils();
    var CurrentYear = new Date().getFullYear();

    $.when(
        U.AJAX('/API/Core/GetRetailerDatas', 'GET', false, false, 'silent').then(R => R),
        U.AJAX(`/API/Core/MarketPartner/GetMarketPartnersAffiliates/-1`).then(R => R),
        LT.LTCodes.Get('EventTransactionRetireStatusOptions'),
        LT.LTCodes.Get('ShipViaList'),


    ).done(function (RetailerData, MarketPartners, InvoiceStatusList, ShipViaList) {

        $(function () {

            var Widgets = {};
            Widgets.RegistrationHistoryData = null;

            Widgets.FromDate = $('#rr-from-date');
            Widgets.ToDate = $('#rr-to-date');
            Widgets.MarketPatner = $('#rr-partner');
            Widgets.InvoiceStatus = $('#rr-status');
            Widgets.FilterButton = $('.filterConditions-query-button');

            Widgets.RegistrationTable = $('.rr-registrations');// registration Plan Table


            Widgets.Init = function () {

                InvoiceStatusList.forEach(location => {
                    var HTML = `<option value="${location.id}">${location.name}</option>`;
                    Widgets.InvoiceStatus.append(HTML);
                });

                MarketPartners.affiliates.forEach(partner => {
                    var HTML = `<option value="${partner.id}">${partner.fullName}</option>`;
                    Widgets.MarketPatner.append(HTML);
                });

            }();


            Widgets.FilterButton.on('click', function () {
                Widgets.FilterRegistrations();
            });

            Widgets.FilterRegistrations = function () {

                let filter = 'Count=100'
                filter += Widgets.FromDate.val() ? `&FromDate=${Widgets.FromDate.val()}` : '';
                filter += Widgets.ToDate.val() ? `&ToDate=${Widgets.ToDate.val()}` : '';
                filter += Widgets.MarketPatner.val() ? `&PartnerId=${Widgets.MarketPatner.val()}` : '';
                filter += Widgets.InvoiceStatus.val() ? `&InvoiceStatus=${Widgets.ShippingLocation.val()}` : '';


                U.AJAX(`/API/SalesOrderManagement/v1/GetOrders?${filter}`, 'GET', false, false, 'silent').then(R => {
                    Widgets.RegistrationHistoryData = R;
                    Widgets.RenderOrders();
                });
            }

            Widgets.RenderOrders = function () {
                $(".new-planAdd-detail").show();
                var TBody = Widgets.RegistrationTable.find(`tbody`);
                TBody.find('tr').remove();
                var RowHTML = "";
                if (Widgets.RegistrationHistoryData && Widgets.RegistrationHistoryData.productOrders && Widgets.RegistrationHistoryData.productOrders.length > 0) {
                    Widgets.RegistrationHistoryData.productOrders.forEach(Data => {
                        RowHTML += `<tr class="new-itemAdd" data-lt-model="${encodeURIComponent(JSON.stringify(Data))}" data-lt-id="" >
                            <td data-label="MarketPartner">${Data.marketPartner || ''}</td>
                            <td data-label="InvoiceNumber">${Data.invoiceNumber || ''}</td>
                            <td data-label="InvoiceDate">${Data.transactionTime ? Data.transactionTime.substring(0, 10) : undefined || ''}</td>
                            <td data-label="DueDate">${Data.dueDate ? Data.dueDate.substring(0, 10) : undefined || ''}</td>
                            <td data-label="PaymentStatus">${Data.status || ''}</td>
                            <td data-label="EffectiveDate">${Data.effectiveDate ? Data.effectiveDate.substring(0, 10) : undefined || ''}</td>
                            <td data-label="Customer">${Data.customerFullName || ''}</td>
                            <td data-label="RegistrationId">${Data.registrationId || ''}</td>
                            <td data-label="OrderId">${Data.orderId || ''}</td>
                            <td data-label="Merch">${Data.merch || ''}</td>
                            <td data-label="PlanId">${Data.planId || ''}</td>
                            <td data-label="PlanPrice">$${Data.planPrice.toFixed(2)}</td>
                            <td data-label="PlanCost">$${Data.planCost.toFixed(2)}</td>
                            <td data-label="Margin">$${Data.margin.toFixed(2)}</td>
                            <td data-label="LocationName">${Data.locationName || ''}</td>
                        </tr>`;
                    });
                }
                $(RowHTML).appendTo(TBody); // add
            };

            U.ShowUI();

        });
    });

})();