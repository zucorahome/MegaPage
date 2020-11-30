/*

    smartship Controller for the View "smartship"
    Copyright 2019, LimeTAC Inc. All rights reserved.

*/

(function () {

    var U = new LTPublicUtils();
    var CurrentYear = new Date().getFullYear();

    $.when(
        U.AJAX('/API/Core/GetRetailerDatas', 'GET', false, false, 'silent').then(R => R),
        LT.LTCodes.Get('EventTypes'),
        $.when(
            LT.LTCodes.Get('ApplicationOwner'),
            LT.LTCodes.Find('AffiliateLocationRelationTypeOptions', 'code', 'ShipFromAddress')
        ).then((AO, RelType) => U.AJAX(
            `/API/Core/AffiliateLocations/-1/null/null/${RelType.id}?geofenceIdListString=&$filter=affiliateId eq ${AO.id}&$orderby=locationName asc`,
            'GET', null, null, 'silent'
        )).then(R => R.items[0].locationId),
        $.when(
            LT.LTCodes.Get('ShipViaList'),
            U.AJAX("/API/Core/ApplicationConfigs?$filter=name eq 'Default_ShipViaCode'", 'GET', false, false, 'silent')
                .then(R => (R && R.items && R.items.length && R.items[0].value) || null)
        ).then((ShipViaList, DefaultShipViaCode) => (ShipViaList.find(x => x.code === DefaultShipViaCode) || { id: ShipViaList[0].id }).id),
        LT.LTCodes.Get('Provinces'),
        LT.LTCodes.Get('PickListEventReviewStatusOptions'),
        LT.LTCodes.Find('EventTransactionDocumentTypeOptions', 'code', 'Receivable').then(R => R.id),
        LT.LTCodes.Get('CurrentUserDetails')
    ).done(function (RetailerData, EventTypes, ApplicationOwnerShipFromId, DefaultShipViaId, Provinces, PickListEventReviewStatusOptions, DefaultDocTypeId, CurrentUserDetails) {

        $(function () {

            var Widgets = {};
            var CCUtil = new LT.CreditCardUtil(RetailerData.retailerAffiliate.id);



            // Page Widgets

            //Customer Details
            Widgets.SmartShipContainer = $('.smartShip-container');
            Widgets.SmartShipFirstName = $('#ss-first-name');
            Widgets.SmartShipLastName = $('#ss-last-name');
            Widgets.SmartShipPhone = $('#ss-phone');
            Widgets.SmartShipEmail = $('#ss-email');

            //Ship to Address
            Widgets.SmartShipAddress1 = $('#ss-address-1');
            Widgets.SmartShipAddress2 = $('#ss-address-2');
            Widgets.SmartShipCity = $('#ss-city');
            Widgets.SmartShipProvince = $('#ss-province');
            Widgets.SmartShipPostalCode = $('#ss-postal');


            //New Item
            Widgets.SmartShipItem = $('#ss-item');
            Widgets.SmartShipItemQuantity = $('#ss-item-quantity');
            Widgets.SmartShipItemOptions = $('#ss-item-options');

            //Item List
            Widgets.SmartShipItemList = $('.ss-item-list');
            Widgets.SmartShipItemListSubtotal = $('.ss-item-list-subtotal');

            //Checkout Button
            Widgets.SmartShipCheckOutButton = $('.ss-checkout');


            // Payment Widgets 
            Widgets.PaymentModalBox = $('.oe-payment-modal-container'); // Payment Modal
            Widgets.PaymentPlaceOrderButton = $('.oe-payment-done');
            Widgets.PaymentModalBoxCloseButton = Widgets.PaymentModalBox.find('span.close-modal');
            Widgets.PaymentOrderTotal = $('.total-order-amount-modal');
            Widgets.PaymentRewardRedemptionAmount = Widgets.PaymentModalBox.find('.rewards-redemption-amount-modal');
            Widgets.PaymentNetAmount = $('.net-amount');
            Widgets.PaymentOptionsList = $('ul.oe-payment-options:not([class="oe-payment-options oe-payment-options-buying-group"]');
            Widgets.PaymentOrderFreightAmount = $('.total-freight-amount');
            Widgets.PaymentOrderTaxAmount = $('.total-tax1-tax2-amount');
            Widgets.PaymentOrderGrandTotalAmount = $('.grand-total-amount');

            Widgets.AddCreditCardModal = $('.oe-credit-cards-add-modal-container').on('click', '.close-modal', () => { Widgets.AddCreditCardModal.addClass('non-visible') });
            Widgets.AddCreditCardName = $('#oe-credit-cards-add-name-on-card', Widgets.AddCreditCardModal);
            Widgets.AddCreditCardNumber = $('#oe-credit-cards-add-card-number', Widgets.AddCreditCardModal);
            Widgets.AddCreditCardMonth = $('#oe-credit-cards-add-expiry-month', Widgets.AddCreditCardModal);
            Widgets.AddCreditCardYear = $('#oe-credit-cards-add-expiry-year', Widgets.AddCreditCardModal);
            Widgets.AddCreditCardCVV = $('#oe-credit-cards-add-cvv', Widgets.AddCreditCardModal);
            Widgets.AddCreditCardBillingAddresses = $('.oe-credit-cards-add-billing-addresses', Widgets.AddCreditCardModal);
            Widgets.AddCreditCardBillingAddressAdd = $('.oe-credit-cards-add-billing-address-add', Widgets.AddCreditCardModal).hide();
            [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15].forEach(Addend => {
                var YYYY = CurrentYear + Addend;
                var HTML = `<option value="${YYYY}">${YYYY}</option>`;
                Widgets.AddCreditCardYear.append(HTML);
            });

            //ThankYou Modal
            Widgets.ThankYouModalBox = $('.oe-thank-you-modal-container'); // ThankYou Modal


            // init
            if (Provinces) {
                Provinces.forEach(L => { Widgets.SmartShipProvince.append(`<option value="${L.id}" lt-data-countryid="${L.countryId}">${L.code}</option>`) });
            }



            Widgets.SmartShipItem.on('input', function () {
                if (Widgets.SmartShipItem.val()) {
                    var TextSoFar = Widgets.SmartShipItem.val() || null;
                    if (TextSoFar && TextSoFar.length > 2) {
                        U.AJAX(`/API/Inventory/GetItemsBasedOnPriceDetail/${RetailerData.retailerAffiliate.id}?$filter=(substringof('${TextSoFar}',code) eq true or substringof('${TextSoFar}',description) eq true)&$top=250`, 'GET', false, false, 'silent')
                            .then(R => {
                                Widgets.SmartShipItemOptions.empty();
                                R.items.forEach(T => {

                                    Widgets.SmartShipItemOptions.append(`<option value="${T.code}" data-lt-value="${T.id}" 
                                                                    data-lt-caseQunatity="${T.caseQuantity}" 
                                                                    data-lt-itemType="${T.itemType}" 
                                                                    data-lt-itemCategory="${T.itemCategory}" 
                                                                    data-lt-itemCode="${T.code}" 
                                                                    data-lt-itemDescription="${T.description}" 
                                                                    data-lt-itemAmountType="${T.amountType}" 
                                                                    data-lt-itemSubAmountTypeId="${T.subAmountTypeId}" 
                                                                    >${T.description}</option>`);
                                });
                            });
                    }
                }
            });

            Widgets.SmartShipItemList.on('click', '.RemoveItem', function () {
                $(this).closest('tr').remove();
                Widgets.FormValidation();
                Widgets.UpdateOrderTotal();

            });

            function ItemValid() {
                var ItemVal = Widgets.SmartShipItem.val().trim();
                return !!ItemVal && Widgets.SmartShipItemOptions.find(`option[value="${ItemVal}"]`).length === 1;
            }
            Widgets.SmartShipItemSaveButton = $('.ss-item-save').on('click keyup', function (E) {
                if (E.type != 'keyup' || E.which == 13) { // click or [Enter]
                    if (ItemValid()) {
                        var Btn = $(this);

                        var TBody = $(`.ss-item-list tbody`);
                        var textValue = Widgets.SmartShipItem.val();
                        var selectedOption = Widgets.SmartShipItemOptions.find(`option[value="${textValue}"]`);
                        var itemId = parseInt(selectedOption.attr("data-lt-value"), 10);
                        var itemType = selectedOption.attr("data-lt-itemType");
                        var itemCategory = selectedOption.attr("data-lt-itemCategory");
                        var itemCode = selectedOption.attr("data-lt-itemCode");
                        var itemDescription = selectedOption.attr("data-lt-itemDescription");
                        var itemAmountType = selectedOption.attr("data-lt-itemAmountType") != 'null' ? parseInt(selectedOption.attr("data-lt-itemAmountType"), 10) : null;
                        var itemSubAmountTypeId = selectedOption.attr("data-lt-itemSubAmountTypeId") != 'null' ? parseInt(selectedOption.attr("data-lt-itemSubAmountTypeId"), 10) : null;
                        var itemQuantity = parseInt(Widgets.SmartShipItemQuantity.val() || 0, 10);

                        var itemIndex = null;

                        if (itemQuantity > 0) {
                            var salesEventTypeId = EventTypes.find(T => ['Sales Order'].indexOf(T.name) > -1).id;
                            Widgets.GetPriceDetail({
                                AffiliateId: RetailerData.retailerAffiliate.id,
                                CountryId: RetailerData.retailerAffiliate.countryId,
                                EventTypeId: salesEventTypeId,
                                ItemId: itemId,
                                Quantity: itemQuantity,
                                FallbackPriceSource: 'Msrp'
                            }).done(result => {
                                var unitPrice = result.listPrice || result.amount || result.caseAmount || 0;

                                var Data = {
                                    ItemId: itemId,
                                    ItemCode: itemCode,
                                    ItemDescription: itemDescription,
                                    ItemAmountType: itemAmountType,
                                    ItemSubAmountTypeId: itemSubAmountTypeId,
                                    ItemQuantity: itemQuantity,
                                    ItemType: itemType,
                                    ItemCategory: itemCategory,
                                    UnitPrice: parseFloat(unitPrice),
                                    DoBackOrder: true,

                                };

                                var uniqueId = U.GenerateUniqueString();

                                //<td data-label="ItemCategory">${Data.ItemCategory || ''}</td>
                                var RowHTML = "";
                                if (Data.ItemQuantity > 0) {
                                    RowHTML = `<tr data-lt-uniqueId="${uniqueId}" class="new-itemAdd individual-item" data-lt-model="${encodeURIComponent(JSON.stringify(Data))}">
                                        <td data-label="SKU Number">${Data.ItemCode || ''}</td>
                                        <td data-label="QTY" style="text-align: right;">${Data.ItemQuantity}</td>
                                        <td data-label="Unit Price" style="text-align: right;">${U.FormatAsDollars(Data.UnitPrice)}</td>
                                        <td data-label="Total" style="text-align: right;">${U.FormatAsDollars(U.PrepMathForView(U.PrepMoneyForMath(Data.UnitPrice) * U.PrepMoneyForMath(Data.ItemQuantity), 1))}</td>
                                        <td data-label="Delete"><i class="fa fa-trash-alt RemoveItem" style="cursor: pointer;"></i></td>
                                    </tr>`;
                                }


                                if (U.IsNumber(itemIndex) && TBody.find(`tr.individual-item[data-lt-uniqueId="${rowUniqueId}"]`).length) {
                                    TBody.find(`tr.individual-item[data-lt-uniqueId="${rowUniqueId}"]`).replaceWith(RowHTML); // edit

                                } else {
                                    $(RowHTML).appendTo(TBody); // add
                                }
                                Widgets.SmartShipItem.val('');
                                Widgets.SmartShipItemQuantity.val('');

                                Widgets.FormValidation();
                                Widgets.UpdateOrderTotal();

                            });
                        } else {
                            Widgets.SmartShipItemQuantity.select();
                        }
                    } else {
                        Widgets.SmartShipItem.select();
                    }
                }
            });

            Widgets.GetPriceDetail = function (parameters) {
                var Promise = new $.Deferred();

                U.AJAX(
                    '/API/InventoryReservation/v1/GetItemPrices', 'POST',
                    {
                        Parameters: [{
                            AffiliateId: parameters.AffiliateId,
                            CountryId: parameters.CountryId,
                            EventTypeId: parameters.EventTypeId,
                            ItemId: parameters.ItemId,
                            Quantity: parameters.Quantity,
                            FallbackPriceSource: parameters.FallbackPriceSource
                        }],
                    },
                    false, 'normal', true
                ).then(R => Promise.resolve(R[0]));
                return Promise;
            };

            var FormElems = $('input:required, select:required', Widgets.SmartShipContainer);
            FormElems.on('change', function () {
                Widgets.FormValidation();
            });

            Widgets.FormValidation = function () {
                var Valid = true;
                FormElems.each(function () {
                    if (!$(this)[0].validity.valid) {
                        Valid = false;
                        return false;
                    }
                });

                Valid && Widgets.SmartShipItemList.find('tr.new-itemAdd').length
                    ? Widgets.SmartShipCheckOutButton.css('background', '').prop('disabled', false)
                    : Widgets.SmartShipCheckOutButton.css('background', '#d9d8d6').prop('disabled', true);
            };
            FormElems.first().trigger('change');

            Widgets.UpdateOrderTotal = function () {
                var subtotal = 0;
                Widgets.SmartShipItemList.find('.new-itemAdd').each(function () {
                    var TR = $(this);
                    var model = JSON.parse(decodeURIComponent(TR.attr('data-lt-model')));
                    subtotal += U.PrepMoneyForMath(model.UnitPrice) * U.PrepMoneyForMath(model.ItemQuantity);
                });
                subtotal = U.PrepMathForView(subtotal, 1);
                Widgets.SmartShipItemListSubtotal.text(U.FormatAsDollars(subtotal));
                Widgets.SmartShipItemListSubtotal.attr("lt-items-subtotal", subtotal);
            };

            function ReserveAndAddToPickList(EventId, EventItemIds) {
                if (EventId && EventItemIds instanceof Array && EventItemIds.length) {
                    var shipViaId =
                        // first EventItem's ShipVia
                        JSON.parse(decodeURIComponent(Widgets.SmartShipItemList.find('.new-itemAdd').first().attr('data-lt-model'))).ShipViaId
                        // default
                        || DefaultShipViaId;
                    return U.AJAX(
                        '/API/inventory/ProcessMultiItemReservation?alternateReservationRoutine=true',
                        'POST', { idList: EventItemIds }, false, 'silent'
                    ).then(() => U.AJAX(
                        '/API/inventory/PickListManagementItemTransactions/0?$filter=orderEventId eq ' + EventId,
                        'GET', false, false, 'silent'
                    )).then(R => {
                        if (R.items.length) {
                            var ItemsNotInPickList = R.items.filter(IX => !IX.pickListEventId);
                            if (ItemsNotInPickList.length) {
                                return U.AJAX(
                                    '/API/Inventory/AddItemsToPickListEvent/'
                                    + U.InnerJoin(ItemsNotInPickList, 'itemTransactionId', ',') + '/'
                                    + '-1/-1/'
                                    + ApplicationOwnerShipFromId + '/'
                                    + PickListEventReviewStatusOptions[0].id + '/'
                                    + '-1/'
                                    + shipViaId + '/'
                                    + '-1/null',
                                    'POST', false, false, 'silent'
                                );
                            }
                        }
                    });
                } else {
                    throw new Error('Please pass an EventId and an Array of EventItemIds.');
                }
            }
            var SubmitOrder = function () {
                function AddEvent() {
                    var EventType = EventTypes.find(T => ['Sales Order'].indexOf(T.name) > -1).name;
                    var Route = null;
                    var Data = {
                        CustomColumns: [],
                        ReviewStatus: 0,
                        Tag1: null,
                        Tag2: null,
                        DiscountPercentage: 0,
                    };
                    switch (EventType) {
                        case 'Purchase Order':
                            Route = '/API/PurchaseOrderManagement/v1/CreatePurchaseOrder';
                            Data.SupplierAffiliateId = RetailerData.retailerAffiliate.id;
                            break;
                        case 'Sales Order':
                            Route = '/API/SalesOrderManagement/v1/CreateSalesOrder';
                            Data.CustomerAffiliateId = RetailerData.retailerAffiliate.id;
                            Data.SendInternalAlert = true;
                            break;
                    }
                    return U.AJAX(Route, 'POST', Data, false, 'silent', true);
                }
                function MakePayment(eventId) {
                    try {
                        if (!eventId) {
                            throw new Error('Please pass an eventId parameter.');
                        }
                        var data = {
                            BillingAffiliateLocationId: parseInt(Widgets.PaymentOptionsList.find('[name="payment-option"]:checked').attr("lt-data-id"), 10),
                            Total: parseFloat(Widgets.PaymentNetAmount.text().replace(/[^0-9.]/g, '')),
                            CurrencyId: RetailerData.retailerAffiliate.currencyId,
                            EventId: eventId,
                            ApplyPayment: true,
                        };
                        return CCUtil.PayWithExisting(data.BillingAffiliateLocationId, data.Total, data.CurrencyId, data.EventId, data.ApplyPayment)
                            .then(
                                function (R) {
                                    return $.extend(R, { paymentSucceeded: CCUtil.DidPaymentSucceed(R.responseCode) });
                                },
                                function (JQXHR, Status, Err) {
                                    U.Alert({ Type: 'Error', Message: Err });
                                    return new $.Deferred().reject();
                                }
                            );
                    } catch (error) {
                        U.Alert({
                            Message: error,
                            Type: 'Error',
                        });
                    }
                }
                function AddShippingAddress() {
                    var SelectedProvince = Widgets.SmartShipProvince.find('option:selected');
                    var Data = {
                        FirstName: Widgets.SmartShipFirstName.val(),
                        LastName: Widgets.SmartShipLastName.val(),
                        FullName: `${Widgets.SmartShipFirstName.val()} ${Widgets.SmartShipLastName.val()}`,
                        HomePhone: Widgets.SmartShipPhone.val(),
                        Email: Widgets.SmartShipEmail.val(),
                        Address1: Widgets.SmartShipAddress1.val().trim(),
                        Address2: Widgets.SmartShipAddress2.val() ? Widgets.SmartShipAddress2.val().trim() : null,
                        City: Widgets.SmartShipCity.val(),
                        ProvinceId: Widgets.SmartShipProvince.val(),
                        CountryId: SelectedProvince.attr("lt-data-countryid"),
                        PostalCode: Widgets.SmartShipPostalCode.val().trim(),
                    };
                    return U.AJAX(
                        '/API/FieldService/CreateAffiliateAndShipToLocation',
                        'POST', Data, false, 'silent', true
                    );
                }
                function AddEventItems(EventId, ShippingLocation) {
                    var Route = null;
                    var Data = { Items: [] };
                    var EventType = EventTypes.find(T => ['Sales Order'].indexOf(T.name) > -1).name;
                    switch (EventType) {
                        case 'Purchase Order':
                            Route = '/API/PurchaseOrderManagement/v1/AddEventItems';
                            Data.PurchaseOrderEventId = EventId;
                            break;
                        case 'Sales Order':
                            Route = '/API/SalesOrderManagement/v1/AddEventItems';
                            Data.SalesOrderEventId = EventId;
                            break;
                    }
                    Widgets.SmartShipItemList.find('.new-itemAdd').each(function () {
                        var TR = $(this);
                        var model = JSON.parse(decodeURIComponent(TR.attr('data-lt-model')));
                        var itemData = {
                            ItemId: model.ItemId,
                            Quantity: model.ItemQuantity,
                            CustomerUnitAmount: model.UnitPrice,
                            Description: model.ItemDescription || null,
                            ShipFromLocationId: ApplicationOwnerShipFromId,
                            ShipToLocationId: ShippingLocation.locationId,
                            ShipViaId: model.ShipViaId || DefaultShipViaId,
                            ShipTermId: model.ShipTermId || null,
                            CarrierAccountNumber: model.CarrierAccountNumber || null,
                            AutoStockBehaviour: model.AutoStockBehaviour || 'Standard',
                            FlowControl: model.FlowControl || 'AutoReserve',
                            AmountType: model.ItemAmountType,
                            DiscountPercentage: model.DiscountPercentage || 0,
                            ClientIdentifier: model.ClientIdentifier || U.GenerateUniqueString(),

                        };
                        Data.Items.push(itemData);
                    });
                    return U.AJAX(Route, 'POST', Data, false, 'silent', true);
                }
                return function (TakePayment) {
                    return AddEvent().then(function (eventId) {
                        return $.when(
                            TakePayment ? MakePayment(eventId) : { paymentSucceeded: true }
                        ).then(function (PR) {
                            if (PR.paymentSucceeded === true) {
                                return AddShippingAddress()
                                    .then(function (affiliateShippingLocation) {
                                        return AddEventItems(eventId, affiliateShippingLocation);
                                    })
                                    .then(function (EIR) {
                                        return new $.Deferred().resolve(
                                            eventId,
                                            EIR.map(EIRX => EIRX.eventItemId)
                                        );
                                    });
                            } else {
                                // TODO: Cancel Sales Event?
                                U.Alert({
                                    Message: 'Payment could not be processed. (' + PR.responseCode.toUpperCase() + ')',
                                    Type: 'Error',
                                });
                            }
                        });
                    });
                };
            }();

            Widgets.ResetScreen = function () {
                Widgets.SmartShipItemList.find('.new-itemAdd').each(function () {
                    var TR = $(this);
                    TR.find(".RemoveItem").trigger('click');
                });
            };





            //CheckOut
            Widgets.SmartShipCheckOutButton.on('click', function () {

                var subtotal = parseFloat(Widgets.SmartShipItemListSubtotal.attr("lt-items-subtotal"));
                var freight = 0;
                var provinceId = Widgets.SmartShipProvince.val();
                U.AJAX(
                    '/api/Financial/GetTaxes', 'POST',
                    {
                        Items:
                            $.map(Widgets.SmartShipItemList.find('.new-itemAdd'), function (Elem) {
                                var model = JSON.parse(decodeURIComponent($(Elem).attr('data-lt-model')));
                                return {
                                    ExtendedAmount: U.PrepMathForView(U.PrepMoneyForMath(model.UnitPrice) * U.PrepMoneyForMath(model.ItemQuantity), 1),
                                    ProvinceId: provinceId,
                                    AmountType: model.ItemAmountType,
                                    SubAmountTypeId: model.ItemSubAmountTypeId,
                                    AffiliateId: RetailerData.retailerAffiliate.id,
                                    DocumentType: DefaultDocTypeId
                                };
                            })
                    },
                    false, 'normal', true
                ).then(function (R) {
                    var tax =
                        U.PrepMathForView(
                            R.reduce(function (A, T) {
                                return A += U.PrepMoneyForMath(T.tax1) + U.PrepMoneyForMath(T.tax2);
                            }, 0)
                        );
                    var grandTotal = U.PrepMathForView(U.PrepMoneyForMath(subtotal) + U.PrepMoneyForMath(freight) + U.PrepMoneyForMath(tax));

                    Widgets.PaymentPlaceOrderButton.css('background', '#d9d8d6').prop('disabled', true);
                    Widgets.PaymentOrderTotal.text(U.FormatAsDollars(subtotal));
                    Widgets.PaymentOrderFreightAmount.text(U.FormatAsDollars(freight));
                    Widgets.PaymentOrderTaxAmount.text(U.FormatAsDollars(tax));
                    Widgets.PaymentOrderGrandTotalAmount.text(U.FormatAsDollars(grandTotal));
                    Widgets.PaymentRewardRedemptionAmount.text('0');
                    Widgets.PaymentNetAmount.text(U.FormatAsDollars(grandTotal)); // TODO: This should be grandTotal - rewardsAmount (points converted to dollars)

                    Widgets.RenderPaymentOptions();
                    Widgets.PaymentModalBox.removeClass('non-visible');
                });

            });



            //Payment 
            Widgets.PaymentModalBoxCloseButton.on('click', function () {
                Widgets.PaymentModalBox.addClass('non-visible');
            });

            Widgets.PaymentPlaceOrderButton.on('click', function () {
                U.LoadingSplash.Show();
                var paymentOption = Widgets.PaymentModalBox.find('input:radio:checked');
                var paymentType = paymentOption.attr('value');
                Widgets.ThankYouModalBox
                    .find(".oe-thank-you-buying-group-container, .oe-thank-you-credit-card-container, .oe-thank-you-on-account-container")
                    .hide();
                SubmitOrder(paymentType == 'credit-card').done(function (eventId, eventItemIds) {
                    var EmailAddress = RetailerData.retailerAffiliate.email || CurrentUserDetails.email;
                    $.when(
                        paymentType != 'buying-group' || !RetailerData.buyingGroup.approvalRequired
                            ? ReserveAndAddToPickList(eventId, eventItemIds)
                            : U.SendAlertToApprover(eventId, RetailerData.buyingGroup.id),
                        EmailAddress
                            ? U.SendSalesOrderConfirmation(eventId, RetailerData.retailerAffiliate.id, EmailAddress, 'silent')
                            : true
                    ).always(function () {
                        U.LoadingSplash.Hide();
                    });
                    if (paymentType == 'credit-card') {
                        Widgets.ThankYouModalBox.find(".oe-thank-you-credit-card-container").show();
                    } else if (paymentType == 'buying-group') {
                        Widgets.ThankYouModalBox.find("span.oe-thank-you-buying-group").text(paymentOption.attr("lt-data-name"));
                        Widgets.ThankYouModalBox.find(".oe-thank-you-buying-group-container").show();
                    }
                    Widgets.ThankYouModalBox.find("span.oe-thank-you-order-number").text(eventId);
                    Widgets.ThankYouModalBox.removeClass('non-visible');
                    Widgets.PaymentModalBox.addClass('non-visible');
                });
            });

            Widgets.PaymentModalBox.on('click', 'a.oe-payment-add-card ', function () {
                Widgets.AddCreditCardModal.find('input, select').val('');
                Widgets.AddCreditCardBillingAddresses.empty();
                Widgets.RenderCCBillingAddresses();
                Widgets.PaymentModalBox.addClass('non-visible');
                Widgets.AddCreditCardModal.removeClass('non-visible');


            });

            Widgets.PaymentModalBox.on('click', 'input:radio[name="payment-option"]', function () {
                Widgets.PaymentPlaceOrderButton.css('background', '').prop('disabled', false)
            });

            Widgets.RenderPaymentOptions = function () {
                Widgets.PaymentOptionsList.empty();
                CCUtil.CreditCards.Refresh().then(() => {

                    if (CCUtil.CreditCards.Get()) {
                        CCUtil.CreditCards.Get().forEach(C => {
                            Widgets.PaymentOptionsList.append(
                                `<li class="flex flex-vert-center">
                                    <input type="radio" name="payment-option" value="credit-card" lt-data-id="${C.id}">
                                    <div class="payment-card-info">
                                        <div class="flex flex-vert-center">
                                            <i class="fab fa-${C.cardType ? `cc-${C.cardType.toLowerCase()}` : 'credit-card'}" title="${C.cardType || 'Card'}" style="color: #1a1f71;"></i>
                                            <p class="u-bold">ending in <span class="ending-numbers">${C.maskedCreditCardNumber.slice(C.cardType === 'Amex' ? -5 : -4)}</span></p>
                                        </div>
                                        <div>${C.locationName}</div>
                                        <div>${C.expiryDate.substr(0, 7)}</div>
                                    </div>
                                </li>`
                            );
                        });
                    }
                });

                if (RetailerData.buyingGroup) {
                    var buyingGroup = RetailerData.buyingGroup;
                    Widgets.PaymentOptionsList.append(
                        `<li class="flex flex-vert-center">
                            <input type="radio" name="payment-option" value="buying-group" lt-data-name="${buyingGroup.name}" lt-data-id="${buyingGroup.id}">
                            <div class="flex flex-vert-center">
                                <p class="u-bold">Use Buying Group</p>
                                <!--<i class="fa fa-info-circle"></i>
                                <div class="buying-group-info-container non-visible">
                                    <i class="fa fa-caret-up"></i>
                                    <p class="info-text">It appears you are a member of <span class="oe-payment-options-buying-group-name">${buyingGroup.name}</span>. Do you wish to purchase through your Group?</p>
                                </div>-->
                            </div>
                        </li>`
                    );
                }
            };


            // Credit Card 

            Widgets.AddCreditCardSave = $('.oe-credit-cards-add-done', Widgets.AddCreditCardModal).on('click', function () {

                var BillingAddressId = Widgets.AddCreditCardBillingAddresses.find('[name="oe-credit-cards-add-billing-address"]:checked').val() || null;

                var CC = {
                    Name: Widgets.AddCreditCardName.val().trim() || null,
                    Number: Widgets.AddCreditCardNumber.val().replace(/[^0-9]/g, '') || null,
                    Type: null,
                    ExpiryMonth: Widgets.AddCreditCardMonth.val() || null,
                    ExpiryYear: Widgets.AddCreditCardYear.val() || null,
                    CVV: Widgets.AddCreditCardCVV.val() || null,
                    BillingAddress: null,
                    IsDefault: false,
                    address: null

                };

                if (!CC.Name) {
                    Widgets.AddCreditCardName.select();
                    return false;
                }
                if (!CC.Number) {
                    Widgets.AddCreditCardNumber.select();
                    return false;
                } else {
                    CC.Type = CCUtil.DetermineCardType(CC.Number);
                }
                if (!CC.ExpiryMonth) {
                    Widgets.AddCreditCardMonth.select();
                    return false;
                }
                if (!CC.ExpiryYear) {
                    Widgets.AddCreditCardYear.select();
                    return false;
                }
                if (!CC.CVV) {
                    Widgets.AddCreditCardCVV.select();
                    return false;
                }
                if (!BillingAddressId) {
                    return false;
                }


                CC.BillingAddress = RetailerData.shipToAndBilToLocations.find(L => L.id == BillingAddressId);

                try {
                    CCUtil.CreditCards.Add(CCUtil.GenerateModel(BillingAddressId, CC.Name, CC.Number, CC.ExpiryMonth, CC.ExpiryYear, CC.CVV,
                        CC.BillingAddress.address1,
                        CC.BillingAddress.address2 || '',
                        CC.BillingAddress.cityName,
                        CC.BillingAddress.provinceId,
                        CC.BillingAddress.countryId,
                        CC.BillingAddress.postalCode,
                        CC.BillingAddress.phoneNumber,
                        CC.BillingAddress.email
                    )).done((newCC) => {
                        Widgets.AddCreditCardModal.addClass('non-visible');
                        Widgets.PaymentModalBox.removeClass('non-visible');
                        Widgets.RenderPaymentOptions();
                    });
                } catch (error) {
                    U.Alert({
                        Message: error,
                        Type: 'Error',
                    });
                }
            });

            Widgets.RenderCCBillingAddresses = function () {

                RetailerData.shipToAndBilToLocations = RetailerData.locations.concat(RetailerData.billToLocations);

                RetailerData.shipToAndBilToLocations.forEach(BillToData => {
                    if (BillToData) {

                        Widgets.AddCreditCardBillingAddresses.append(
                            `<div class="flex flex-vert-center">
                        <input id="oe-credit-cards-add-billing-address-${BillToData.id}" name="oe-credit-cards-add-billing-address" type="radio" value="${BillToData.id}" />
                        <label for="oe-credit-cards-add-billing-address-${BillToData.id}">
                            ${U.RenderAddress(BillToData, Provinces, null, false, false, true)}
                        </label>
                    </div>`
                        );
                    }
                });


            };


            // Thank You
            Widgets.ThankYouModalBox.on('click', 'span.close-modal, button.zuc-btn-secondary', function () {
                Widgets.ResetScreen();
                Widgets.ThankYouModalBox.addClass('non-visible');
            });


            // INIT

            U.ShowUI();

        });
    });

})();