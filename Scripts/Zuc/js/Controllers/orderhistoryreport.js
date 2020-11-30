﻿/*

    orderhistoryreport Controller for the View "orderhistoryreport"
    Copyright 2020, LimeTAC Inc. All rights reserved.

*/

(function () {

    var U = new LTPublicUtils();
    var CurrentYear = new Date().getFullYear();

    $.when(
        U.AJAX('/API/Core/GetRetailerDatas', 'GET', false, false, 'silent').then(R => R),
        U.AJAX(`/API/Core/MarketPartner/GetMarketPartnersAffiliates/-1`).then(R => R.affiliates),
        U.AJAX(`/API/Core/MarketPartner/GetShippingLocations`).then(R => R || []),
        LT.LTCodes.Get('ShipViaList')
    ).done(function (RetailerData, MarketPartners, ShippingLocations, ShipViaList) {

        $(function () {

            var Widgets = {};
            Widgets.OrderHistoryData = null;
            
            Widgets.FromDate = $('#ohr-from-date');
            Widgets.ToDate = $('#ohr-to-date');
            Widgets.ShippingLocation = $('#ohr-location');
            Widgets.MarketPartner =
                $('#ohr-partner')
                    .append(MarketPartners.reduce((A, P) => A + `<option value="${P.id}">${P.fullName}</option>`, ''))
                    .on('change', function () {
                        var PartnerId = $(this).val() || null;
                        Widgets.ShippingLocation.children(':gt(0)').remove();
                        Widgets.ShippingLocation.append(
                            ShippingLocations.reduce(
                                (A, L) => A + (!PartnerId || L.affiliateId == PartnerId ? `<option value="${L.id}">${L.name}</option>` : ''),
                                ''
                            )
                        );
                    })
                    .trigger('change');
            if (!MarketPartners.length) {
                Widgets.MarketPartner.closest('div').hide();
            }
            Widgets.FilterButton = $('.filterConditions-query-button');

            Widgets.OrdersTable = $('.ohr-orders');// Order Table

            Widgets.FilterButton.on('click', function () {
                Widgets.FilterOrders();
            });

            Widgets.FilterOrders = function () {

                let filter = 'Count=100'
                filter += Widgets.FromDate.val() ? `&FromDate=${Widgets.FromDate.val()}`: '' ;
                filter += Widgets.ToDate.val() ? `&ToDate=${Widgets.ToDate.val()}`: '' ;
                filter += Widgets.MarketPartner.val() ? `&PartnerId=${Widgets.MarketPartner.val()}`: '' ;
                filter += Widgets.ShippingLocation.val() ? `&ShippingLocationId=${Widgets.ShippingLocation.val()}`: '' ;
              

                U.AJAX(`/API/SalesOrderManagement/v1/GetOrders?${filter}`).then(R => {
                    Widgets.OrderHistoryData = R;
                    Widgets.RenderOrders();
                });
            }

            Widgets.RenderOrders = function () {
                $(".new-planAdd-detail").show();
                var TBody = Widgets.OrdersTable.find(`tbody`);
                TBody.find('tr').remove();
                var RowHTML = "";
                if (Widgets.OrderHistoryData && Widgets.OrderHistoryData.productOrders && Widgets.OrderHistoryData.productOrders.length > 0) {
                    Widgets.OrderHistoryData.productOrders.forEach(Data => {
                        RowHTML += `<tr class="new-itemAdd" data-lt-model="${encodeURIComponent(JSON.stringify(Data))}" data-lt-id="" >
                            <td data-label="Date">${Data.date ? Data.date.substring(0, 10) : undefined || ''}</td>
                            <td data-label="Customer">${Data.customerFullName || ''}</td>
                            <td data-label="Location">${Data.shippingLocationName || ''}</td>
                            <td data-label="OrderId">${Data.orderId || ''}</td>
                            <td data-label="PORef">${Data.poRef || ''}</td>
                            <td data-label="MarketPartner">${Data.marketPartner || ''}</td>
                            <td data-label="OrderValue">$${Data.value.toFixed(2)}</td>
                            <td data-label="ShipVia">${(Data.shipViaId ? ShipViaList.find(x => x.id == Data.shipViaId).code : null )|| ''}</td>
                            <td data-label="Units">${Data.freight.toFixed(2)}</td>
                            <td data-label="Units">${Data.tax.toFixed(2)}</td>
                            <td data-label="Units">${Data.total.toFixed(2)}</td>
                        </tr>`;
                    });
                }
                $(RowHTML).appendTo(TBody); // add
            };

            U.ShowUI();

        });
    });

})();