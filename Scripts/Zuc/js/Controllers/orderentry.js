/*

    orderentry Controller for the View "orderentry"
    Copyright 2019, LimeTAC Inc. All rights reserved.

*/

(function () {

    var U = new LTPublicUtils();
    var CurrentYear = new Date().getFullYear();

    $.when(
        U.AJAX('/API/Core/GetRetailerDatas', 'GET', false, false, 'silent').then(R => {
            return $.when(
                R.retailerAffiliate.remoteFreightItemCode
                    ? LT.LTCodes.Find('ItemClassOptions', 'code', 'NonStock')
                        .then(IC => U.AJAX(
                            `/api/Inventory/Items?$filter=code eq '${R.retailerAffiliate.remoteFreightItemCode.replace(/'/g, "''")}' and itemClass eq ${IC.id}`,
                            'GET', false, false, 'silent'
                        ))
                        .then(IR => IR.items[0] || null)
                    : null
            ).then(Item => {
                delete R.retailerAffiliate.remoteFreightItemCode;
                return $.extend(true, R, { retailerAffiliate: { remoteFreightItem: Item } });
            });
        }),
        LT.LTCodes.Get('EventTypes'),
        $.when(
            LT.LTCodes.Get('ApplicationOwner'),
            LT.LTCodes.Find('AffiliateLocationRelationTypeOptions', 'code', 'ShipFromAddress')
        ).then((AO, RelType) => U.AJAX(
            `/API/Core/AffiliateLocations/-1/null/null/${RelType.id}?geofenceIdListString=&$filter=affiliateId eq ${AO.id}&$orderby=locationName asc`,
            'GET', null, null, 'silent'
        )).then(R => R.items[0].locationId),
        LT.LTCodes.Get('BinTypeOptions'),
        $.when(
            LT.LTCodes.Get('ShipViaList'),
            U.AJAX("/API/Core/ApplicationConfigs?$filter=name eq 'Default_ShipViaCode'", 'GET', false, false, 'silent')
                .then(R => (R && R.items && R.items.length && R.items[0].value) || null)
        ).then((ShipViaList, DefaultShipViaCode) => (ShipViaList.find(x => x.code === DefaultShipViaCode) || { id: ShipViaList[0].id }).id),
        LT.LTCodes.Get('CanadianProvinceList'),
        LT.LTCodes.Get('Countries'),
        LT.LTCodes.Get('PickListEventReviewStatusOptions'),
        LT.LTCodes.Find('EventTransactionDocumentTypeOptions', 'code', 'Receivable').then(R => R.id),
        LT.LTCodes.Get('CurrentUserDetails')
    ).done(function (RetailerData, EventTypes, ApplicationOwnerShipFromId, BinTypeOptions, DefaultShipViaId, Provinces, Countries, PickListEventReviewStatusOptions, DefaultDocTypeId, CurrentUserDetails) {

        $(function () {

            


            var Widgets = {};
            var CCUtil = new LT.CreditCardUtil(RetailerData.retailerAffiliate.id);


            // Page Widgets
            Widgets.OrderEntrySubmitButton = $('.oe-submit');
            Widgets.OrderEntryPoRef = $('input[id="oe-po-ref"]');
            Widgets.OrderEntryRemoveOrderButton = $('a.oe-remove-order');

            Widgets.Store = $('select[id="oe-location"]');

            Widgets.OrderAddItemsButton = $('.oe-add-item');// Show Add Item Modal
            Widgets.OrderItemsTable = $('.oe-items');// Order Items Table
            Widgets.OrderItemsSubtotal = Widgets.OrderItemsTable.find('td.oe-items-subtotal');// Order Items Total

            Widgets.OrderItemBox = $('.oe-add-item-modal-container'); // Add Item Modal box
            Widgets.OrderItemSaveAndAddItemButton = $('.oe-add-item-add-more');
            Widgets.OrderItemAddItemButton = $('.oe-add-item-add');

            Widgets.OrderItemItem = $('input[id="oe-add-item-item"]'); // Item textbox
            Widgets.OrderItemList = Widgets.OrderItemBox.find('datalist[id="oe-add-item-item-options"]')
            Widgets.OrderItemUnitQuantity = Widgets.OrderItemBox.find('#oe-add-item-unit-quantity');
            Widgets.OrderItemUnitQuantityAmount = Widgets.OrderItemBox.find('#oe-add-item-unit-quantity-amount');
            Widgets.OrderItemCaseQuantityContainer = $('.case-quantity-container', Widgets.OrderItemBox);
            Widgets.OrderItemCaseQuantity = Widgets.OrderItemBox.find('#oe-add-item-case-quantity');
            Widgets.OrderItemCaseQuantityAmount = Widgets.OrderItemBox.find('#oe-add-item-case-quantity-amount');
            Widgets.OrderItemCaseUnits = Widgets.OrderItemBox.find('span.oe-add-item-case-units');
            Widgets.OrderItemAvailableUnits = Widgets.OrderItemBox.find('span.oe-add-item-available-units');
            Widgets.OrderItemThumb = $('.oe-add-item-product-thumb', Widgets.OrderItemBox);
            Widgets.OrderItemDoBackOrder = Widgets.OrderItemBox.find('input[id="oe-add-item-do-backorder"]');
            Widgets.CloseModalButton = Widgets.OrderItemBox.find('span.close-modal');
            Widgets.OrderItemBackOrderContainer = Widgets.OrderItemBox.find('div.oe-add-item-backorder-container');


            Widgets.OrderItemBackOrderModal = $('.oe-backorder-warning-modal-container'); // Back Order Modal box
            Widgets.OrderItemBackOrderCloseButton = Widgets.OrderItemBackOrderModal.find('span.close-modal');
            Widgets.OrderItemBackOrderProceedButton = Widgets.OrderItemBackOrderModal.find('button.oe-backorder-warning-proceed');
            Widgets.OrderItemBackOrderWarningItems = Widgets.OrderItemBackOrderModal.find('table.oe-backorder-warning-items');


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

            Widgets.AddCreditCardModal = $('.pp-credit-card-edit-modal-container').on('click', '.close-modal', () => { Widgets.AddCreditCardModal.addClass('non-visible') });
            Widgets.AddCreditCardName = $('#oe-add-credit-card-name-on-card', Widgets.AddCreditCardModal);
            Widgets.AddCreditCardNumber = $('#oe-add-credit-card-card-number', Widgets.AddCreditCardModal);
            Widgets.AddCreditCardMonth = $('#oe-add-credit-card-expiry-month', Widgets.AddCreditCardModal);
            Widgets.AddCreditCardYear = $('#oe-add-credit-card-expiry-year', Widgets.AddCreditCardModal);
            Widgets.AddCreditCardCVV = $('#oe-add-credit-card-security-code', Widgets.AddCreditCardModal);
            Widgets.AddCreditCardNewBillingContainer = $('.edit-billing-address-form', Widgets.AddCreditCardModal);
            Widgets.AddCreditCardBillingAddress1 = $('#oe-add-credit-card-billing-address-1', Widgets.AddCreditCardNewBillingContainer);
            Widgets.AddCreditCardBillingAddress2 = $('#oe-add-credit-card-billing-address-2', Widgets.AddCreditCardNewBillingContainer);
            Widgets.AddCreditCardBillingCity = $('#oe-add-credit-card-billing-city', Widgets.AddCreditCardNewBillingContainer);
            Widgets.AddCreditCardBillingProvince = $('#oe-add-credit-card-billing-province', Widgets.AddCreditCardNewBillingContainer);
            Provinces.forEach(function (P) {
                Widgets.AddCreditCardBillingProvince.append('<option value="' + P.id + '">' + P.code + '</option>');
            });
            Widgets.AddCreditCardBillingPostal = $('#oe-add-credit-card-billing-postal', Widgets.AddCreditCardNewBillingContainer);
            Widgets.AddCreditCardBillingPhone = $('#oe-add-credit-card-billing-phone', Widgets.AddCreditCardNewBillingContainer);
            Widgets.AddCreditCardBillingEmail = $('#oe-add-credit-card-billing-email', Widgets.AddCreditCardNewBillingContainer);
            Widgets.AddCreditCardBillingAddresses =
                $('#oe-add-credit-card-billing-helper', Widgets.AddCreditCardModal).on('change', function () {
                    var Data = {};
                    if (!!Widgets.AddCreditCardBillingAddresses.val()) {
                        Data =
                            JSON.parse(
                                decodeURIComponent(
                                    Widgets.AddCreditCardBillingAddresses
                                        .children(':selected')
                                        .attr('data-lt-data')
                                )
                            );
                        Widgets.AddCreditCardNewBillingContainer.hide();
                    } else {
                        Widgets.AddCreditCardNewBillingContainer.show();
                    }
                    Widgets.AddCreditCardBillingAddress1.val(Data.address1 || '');
                    Widgets.AddCreditCardBillingAddress2.val(Data.address2 || '');
                    Widgets.AddCreditCardBillingCity.val(Data.cityName || '');
                    Widgets.AddCreditCardBillingProvince.val(Data.provinceId || '');
                    Widgets.AddCreditCardBillingPostal.val(Data.postalCode || '');
                    Widgets.AddCreditCardBillingPhone.val(Data.phoneNumber || '');
                    Widgets.AddCreditCardBillingEmail.val(Data.email || '');
                });
            [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15].forEach(Addend => {
                var YYYY = CurrentYear + Addend;
                var HTML = `<option value="${YYYY}">${YYYY}</option>`;
                Widgets.AddCreditCardYear.append(HTML);
            });

            //ThankYou Modal
            Widgets.ThankYouModalBox = $('.oe-thank-you-modal-container'); // ThankYou Modal


            // Order
            if (RetailerData.locations != null) {
                RetailerData.locations.forEach(L => { if (L.isActive) Widgets.Store.append(`<option value="${L.id}">${L.name}</option>`) });
            }

            function ResetAddItemFields() {
                Widgets.OrderItemAvailableUnits.text('').parent().hide();
                Widgets.OrderItemUnitQuantity.val('');
                Widgets.OrderItemUnitQuantityAmount.html('').removeAttr('data-lt-price-detail-base');
                Widgets.OrderItemCaseQuantityContainer.hide();
                Widgets.OrderItemCaseQuantity.val('');
                Widgets.OrderItemCaseQuantityAmount.html('').removeAttr('data-lt-price-detail-base');
                Widgets.OrderItemCaseUnits.text('');
                Widgets.OrderItemThumb.attr('src', '');
                Widgets.OrderItemBackOrderContainer.hide();
                Widgets.OrderItemDoBackOrder.prop("checked", true);
            }
            Widgets.OrderAddItemsButton.on('click', function () {
                // reset button text in case user edited an item in between
                Widgets.OrderItemSaveAndAddItemButton.show();
                Widgets.OrderItemAddItemButton.text('Add');
                // reset fields and datalist
                Widgets.OrderItemItem.val('');
                Widgets.OrderItemList.empty();
                ResetAddItemFields();
                // show the modal and put the cursor in the Item field
                Widgets.OrderItemBox.removeClass('non-visible');
                Widgets.OrderItemItem.select();
            });

            Widgets.CloseModalButton.on('click', function () {
                Widgets.OrderItemBox.addClass('non-visible').removeAttr('data-lt-item-index').removeAttr('data-lt-row-uniqueid');
            });

            Widgets.OrderItemsTable.on('click', '.RemoveItem', function () {
                $(this).closest('tr').remove();
                Widgets.FormValidation();
                Widgets.UpdateOrderTotal();
            });


            // Order Item
            var OrderItemFormElems = $('input:not([type="hidden"]), select:not([type="hidden"])', Widgets.OrderItemBox);
            function ItemBoxItemValid() {
                var ItemVal = Widgets.OrderItemItem.val().trim();
                return !!ItemVal && Widgets.OrderItemList.find(`option[value="${ItemVal}"]`).length === 1;
            }
            OrderItemFormElems.on('change', function () {
                var Valid = ItemBoxItemValid();
                var UnitQty = parseInt(Widgets.OrderItemUnitQuantity.val(), 10);
                Widgets.OrderItemUnitQuantity.val(UnitQty || '');
                var UnitAmt = parseFloat(Widgets.OrderItemUnitQuantityAmount.html().replace(/[^0-9.]/g, ''));
                var UnitFilled = UnitQty > 0 && UnitAmt > 0;
                var CaseQty = parseInt(Widgets.OrderItemCaseQuantity.val(), 10);
                Widgets.OrderItemCaseQuantity.val(CaseQty || '');
                var CaseAmt = parseFloat(Widgets.OrderItemCaseQuantityAmount.html().replace(/[^0-9.]/g, ''));
                var CaseFilled = CaseQty > 0 && CaseAmt > 0;
                if (!UnitFilled && !CaseFilled) Valid = false;
                Widgets.OrderItemBoxSaveBtns
                    .css('background', Valid ? '' : '#d9d8d6')
                    .prop('disabled', !Valid);
            });

            Widgets.OrderItemItem.on('change', function (E) {
                ResetAddItemFields();

                // get default unit and case prices and in stock qty
                if (ItemBoxItemValid()) {
                    U.LoadingSplash.Show();
                    var selectedOption = Widgets.OrderItemList.find(`option[value="${Widgets.OrderItemItem.val().trim()}"]`);
                    var itemId = parseInt(selectedOption.attr("data-lt-value"), 10);
                    var caseQuantity =
                        selectedOption.attr("data-lt-caseQuantity") != 'null'
                            ? parseInt(selectedOption.attr("data-lt-caseQuantity"), 10)
                            : null;
                    if (caseQuantity) {
                        Widgets.OrderItemCaseQuantityContainer.show();
                        Widgets.OrderItemCaseUnits.text(caseQuantity);
                    } else {
                        Widgets.OrderItemCaseQuantityContainer.hide();
                    }
                    $.when(
                        UpdateUnitCasePrices(1, 'silent'),
                        Widgets.GetAvailableQuantity(itemId, ApplicationOwnerShipFromId)
                            .done(function (R) { Widgets.OrderItemAvailableUnits.text(R).parent().show() }),
                        U.AJAX('/api/Inventory/Items?$filter=id eq ' + itemId, 'GET', false, false, 'silent').done(function (R) {
                            Widgets.OrderItemThumb.attr(
                                'src',
                                U.GetECommerceAttachments(R.items[0].attachments, true)
                                    .concat(U.GetECommerceAttachments(R.items[0].attachments))[0]
                                    .address
                            );
                        })
                    ).done(function () {
                        U.LoadingSplash.Hide();
                    });
                }
            });

            Widgets.OrderItemItem.on('focus', function () {
                $(this).val('').trigger('change');
            });

            var autocompleteTO = null;
            Widgets.OrderItemItem.on('keyup', function (E) {
                var TextSoFar = Widgets.OrderItemItem.val() || null;
                // for some reason E.key is undefined when pressing [Enter] to select an item from the datalist; !!E.key allows us to prevent the widget from being cleared and requeried on selection
                if (TextSoFar && TextSoFar.length > 2 && !!E.key && (E.key.length === 1 || ['Backspace', 'Delete'].indexOf(E.key) > -1)) {
                    ResetAddItemFields();
                    Widgets.OrderItemList.empty();
                    if (autocompleteTO) {
                        clearTimeout(autocompleteTO);
                    }
                    autocompleteTO =
                        setTimeout(
                            function () {
                                U.AJAX(
                                    `/API/Inventory/GetItemsBasedOnPriceDetail/${RetailerData.retailerAffiliate.id}?$filter=(substringof('${TextSoFar}',code) eq true or substringof('${TextSoFar}',description) eq true)&$top=250`,
                                    'GET', false, false, 'silent'
                                ).then(function (R) {
                                    Widgets.OrderItemList.empty();
                                    R.items.forEach(function (T) {
                                        Widgets.OrderItemList.append(
                                            `<option value="${`${T.description} - ${T.code}`.trim()}"
                                                data-lt-value="${T.id}"
                                                data-lt-caseQuantity="${T.caseQuantity}"
                                                data-lt-itemType="${T.itemType}"
                                                data-lt-itemCategory="${T.itemCategory}"
                                                data-lt-itemCode="${T.code}"
                                                data-lt-itemDescription="${T.description}"
                                                data-lt-itemAmountType="${T.amountType}"
                                                data-lt-itemSubAmountTypeId="${T.subAmountTypeId}"
                                            ></option>`
                                        );
                                    });
                                });
                            },
                            500
                        );
                }
            });

            Widgets.OrderItemDoBackOrder.on('change', function () {
                var itemQuantity = parseFloat(Widgets.OrderItemUnitQuantity.val() || 0);
                var numberOfCases = parseFloat(Widgets.OrderItemCaseQuantity.val() || 0);
                var textValue = Widgets.OrderItemItem.val() || null;
                var selectedOption = Widgets.OrderItemList.find(`option[value="${textValue}"]`);
                var caseQuantity = parseFloat(selectedOption.attr("data-lt-caseQuantity") || 0);
                var unitsToBeAdded =
                    parseFloat(
                        U.PrepMathForView(
                            U.PrepMoneyForMath(itemQuantity)
                            + U.PrepMoneyForMath(
                                U.PrepMathForView(
                                    U.PrepMoneyForMath(numberOfCases) * U.PrepMoneyForMath(caseQuantity),
                                    1
                                )
                            )
                        )
                    );

                var availableUnits = parseFloat(Widgets.OrderItemAvailableUnits.text());

                if (!$(this).is(':checked') && unitsToBeAdded > availableUnits) {
                    Widgets.OrderItemCaseQuantity.val(parseInt(availableUnits / caseQuantity, 10));
                    Widgets.OrderItemUnitQuantity.val(parseInt(availableUnits % caseQuantity, 10));
                }

            });

            Widgets.GetAvailableQuantity = function (ItemId, LocationId) {
                var Promise = new $.Deferred();

                var BinTypeIds = [
                    BinTypeOptions.find(O => O.code == 'Making').id,
                    BinTypeOptions.find(O => O.code == 'OnHand').id
                ];

                U.AJAX(
                    `/API/Inventory/ItemBins/false/false?$filter=itemId eq ${ItemId} and (binType eq ${BinTypeIds.join(' or binType eq ')}) and binWarehouseId eq ${LocationId}`,
                    'GET', false, false, 'silent'
                ).then(Result => {
                    Promise.resolve(parseFloat(
                        U.PrepMathForView(
                            Result.items.reduce((A, R) => A + (U.PrepMoneyForMath(R.quantity) - U.PrepMoneyForMath(R.reservedQuantity)), 0)
                        )
                    ));
                });
                return Promise;

            };

            function UpdateUnitCasePrices(Qty, Mode) {
                return U.AJAX(
                    '/API/InventoryReservation/v1/GetItemPrices', 'POST',
                    {
                        Parameters: [{
                            AffiliateId: RetailerData.retailerAffiliate.id,
                            CountryId: RetailerData.retailerAffiliate.countryId,
                            EventTypeId: EventTypes.find(function (T) { return ['Sales Order'].indexOf(T.name) > -1 }).id,
                            ItemId: Widgets.OrderItemList.find(`option[value="${Widgets.OrderItemItem.val()}"]`).attr("data-lt-value"),
                            Quantity: Qty,
                            FallbackPriceSource: 'Msrp'
                        }],
                    },
                    false, Mode, true
                ).then(function (R) {
                    Widgets.OrderItemUnitQuantityAmount
                        .html('&nbsp;x&nbsp;' + U.FormatAsDollars(R[0].amount))
                        .attr('data-lt-price-detail-base', R[0].amount);
                    Widgets.OrderItemCaseQuantityAmount
                        .html('&nbsp;x&nbsp;' + U.FormatAsDollars(R[0].caseAmount || R[0].amount))
                        .attr('data-lt-price-detail-base', R[0].caseAmount || R[0].amount);
                    return R[0];
                });
            };
            Widgets.OrderItemUnitQuantity
                .add(Widgets.OrderItemCaseQuantity)
                .on('change', function (E) {
                    var QtyField = $(this);
                    Widgets.OrderItemUnitQuantityAmount.html('');
                    Widgets.OrderItemCaseQuantityAmount.html('');
                    Widgets.OrderItemBackOrderContainer.hide();
                    Widgets.OrderItemDoBackOrder.prop("checked", true);
                    if (ItemBoxItemValid()) {
                        var CachedUnitAmt = Widgets.OrderItemUnitQuantityAmount.attr('data-lt-price-detail-base') || null;
                        if (CachedUnitAmt) {
                            Widgets.OrderItemUnitQuantityAmount.html('&nbsp;x&nbsp;' + U.FormatAsDollars(CachedUnitAmt));
                        }
                        var CachedCaseAmt = Widgets.OrderItemCaseQuantityAmount.attr('data-lt-price-detail-base') || null;
                        if (CachedCaseAmt) {
                            Widgets.OrderItemCaseQuantityAmount.html('&nbsp;x&nbsp;' + U.FormatAsDollars(CachedCaseAmt));
                        }
                        var TotalUnits =
                            parseInt(Widgets.OrderItemUnitQuantity.val() || 0, 10)
                            + (parseInt(Widgets.OrderItemCaseQuantity.val() || 0, 10) * parseInt(Widgets.OrderItemCaseUnits.text().replace(/[^0-9.]/g, ''), 10));
                        if (TotalUnits) {
                            UpdateUnitCasePrices(TotalUnits);
                            if (TotalUnits > parseInt(Widgets.OrderItemAvailableUnits.text(), 10)) {
                                Widgets.OrderItemBackOrderContainer.show();
                            }
                        }
                    }
                });

            Widgets.OrderItemBoxSaveBtns =
                Widgets.OrderItemAddItemButton
                    .add(Widgets.OrderItemSaveAndAddItemButton)
                    .on('click', function () {
                        var Btn = $(this);
                        var TBody = $(`.oe-items tbody`);
                        // maximize the number of cases the user is ordering for savings
                        var UnitsPerCase = parseInt(Widgets.OrderItemCaseUnits.text().replace(/[^0-9.]/g, ''), 10);
                        var _TotalUnits =
                            parseInt(Widgets.OrderItemUnitQuantity.val() || 0, 10) // temp UnitQty
                            + (parseInt(Widgets.OrderItemCaseQuantity.val() || 0, 10) * UnitsPerCase); // temp CaseQty
                        var CaseQty = Math.floor(_TotalUnits / UnitsPerCase);
                        var UnitQty = _TotalUnits % UnitsPerCase;
                        // prep data
                        var selectedOption = Widgets.OrderItemList.find(`option[value="${Widgets.OrderItemItem.val()}"]`);
                        var Data = {
                            ItemId: parseInt(selectedOption.attr("data-lt-value"), 10),
                            ItemCode: selectedOption.attr("data-lt-itemCode"),
                            ItemDescription: selectedOption.attr("data-lt-itemDescription"),
                            ItemAmountType: parseInt(selectedOption.attr("data-lt-itemAmountType"), 10) || null,
                            ItemSubAmountTypeId: parseInt(selectedOption.attr("data-lt-itemSubAmountTypeId"), 10) || null,
                            ItemQuantity: UnitQty,
                            NumberOfCases: CaseQty,
                            CaseExtendedQuantity: CaseQty * UnitsPerCase,
                            ItemType: selectedOption.attr("data-lt-itemType"),
                            ItemCategory: selectedOption.attr("data-lt-itemCategory"),
                            StandardUnitPrice: parseFloat(Widgets.OrderItemUnitQuantityAmount.html().replace(/[^0-9.]/g, '')),
                            CaseUnitPrice: parseFloat(Widgets.OrderItemCaseQuantityAmount.html().replace(/[^0-9.]/g, '')),
                            UnitsPerCase: UnitsPerCase,
                            DoBackOrder: Widgets.OrderItemDoBackOrder.is(":checked"),
                            IsCaseItem: CaseQty > 0,
                        };
                        // remove prior Item <tr>s
                        TBody.find(`tr.individual-item[data-lt-uniqueId="${Widgets.OrderItemBox.attr('data-lt-row-uniqueid')}"]`).remove();
                        // generate new Item <tr>s
                        var priorItemIndex = parseInt(Widgets.OrderItemBox.attr('data-lt-item-index'), 10);
                        var newUniqueId = U.GenerateUniqueString();
                        if (Data.ItemQuantity > 0) {
                            var UnitRow =
                                $(`<tr data-lt-uniqueId="${newUniqueId}" class="new-itemAdd individual-item" data-lt-model="${encodeURIComponent(JSON.stringify(Data))}">
                                    <td data-label="ItemType">${Data.ItemType || ''}</td>
                                    <td data-label="SKU Number">${Data.ItemCode || ''}</td>
                                    <td data-label="Description">${Data.ItemDescription || ''}</td>
                                    <td data-label="QTY" style="text-align: right;">${Data.ItemQuantity}</td>
                                    <td data-label="Unit Price" style="text-align: right;">${U.FormatAsDollars(Data.StandardUnitPrice)}</td>
                                    <td data-label="Total" style="text-align: right;">${U.FormatAsDollars(U.PrepMathForView(U.PrepMoneyForMath(Data.StandardUnitPrice) * U.PrepMoneyForMath(Data.ItemQuantity), 1))}</td>
                                    <td data-label="Delete" style="text-align: right;"><i class="fa fa-trash-alt RemoveItem" title="Remove" style="cursor: pointer;"></i></td>
                                </tr>`);
                            U.IsNumber(priorItemIndex)
                                ? UnitRow.insertBefore(TBody.children().eq(priorItemIndex)) // edit
                                : UnitRow.appendTo(TBody); // add
                        }
                        if (Data.NumberOfCases > 0) {
                            var CaseRow =
                                $(`<tr data-lt-uniqueId="${newUniqueId}" class="new-itemAdd case-item" data-lt-model="${encodeURIComponent(JSON.stringify(Data))}">
                                    <td data-label="ItemType">${Data.ItemType || ''}</td>
                                    <td data-label="SKU Number">${Data.ItemCode || ''}</td>
                                    <td data-label="Description">(${Data.NumberOfCases} cases)-${Data.ItemDescription || ''}</td>
                                    <td data-label="QTY" style="text-align: right;">${Data.CaseExtendedQuantity}</td>
                                    <td data-label="Unit Price" style="text-align: right;">${U.FormatAsDollars(Data.CaseUnitPrice)}</td>
                                    <td data-label="Total" style="text-align: right;">${U.FormatAsDollars(U.PrepMathForView(U.PrepMoneyForMath(Data.CaseUnitPrice) * U.PrepMoneyForMath(Data.CaseExtendedQuantity), 1))}</td>
                                    <td data-label="Delete" style="text-align: right;"><i class="fa fa-trash-alt RemoveItem" title="Remove" style="cursor: pointer;"></i></td>
                                </tr>`);
                            U.IsNumber(priorItemIndex)
                                ? CaseRow.insertBefore(TBody.children().eq(priorItemIndex)) // edit
                                : CaseRow.appendTo(TBody); // add
                        }
                        // hide modal
                        Widgets.OrderItemBox.addClass('non-visible').removeAttr('data-lt-item-index').removeAttr('data-lt-row-uniqueid');
                        // reopen modal, if requested by user
                        if (Btn.hasClass('oe-add-item-add-more')) {
                            Widgets.OrderAddItemsButton.trigger('click');
                        }
                        // update the UI under the modal
                        Widgets.FormValidation();
                        Widgets.UpdateOrderTotal();
                    });

            var FormElems = $('input:required, select:required', '.order-entry-container');
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

                Valid && Widgets.OrderItemsTable.find('tr.new-itemAdd').length
                    ? Widgets.OrderEntrySubmitButton.css('background', '').prop('disabled', false)
                    : Widgets.OrderEntrySubmitButton.css('background', '#d9d8d6').prop('disabled', true);
            };
            FormElems.first().trigger('change');

            Widgets.UpdateOrderTotal = function () {
                var totalOrder = 0;
                Widgets.OrderItemsTable.find('.new-itemAdd').each(function () {
                    var TR = $(this);
                    var model = JSON.parse(decodeURIComponent(TR.attr('data-lt-model')));
                    totalOrder += TR.hasClass("case-item")
                        ? U.PrepMoneyForMath(model.CaseUnitPrice) * U.PrepMoneyForMath(model.CaseExtendedQuantity)
                        : U.PrepMoneyForMath(model.StandardUnitPrice) * U.PrepMoneyForMath(model.ItemQuantity);
                });
                totalOrder = U.PrepMathForView(totalOrder, 1);
                Widgets.OrderItemsSubtotal.text(U.FormatAsDollars(totalOrder));
            };

            // Create Order
            var PreProcessForWarehouse = function () {
                function ReserveEventItems(EventItemIds) {
                    if (EventItemIds instanceof Array && EventItemIds.length) {
                        return U.AJAX(
                            '/API/inventory/ProcessMultiItemReservation?alternateReservationRoutine=true',
                            'POST', { idList: EventItemIds }, false, 'silent'
                        );
                    } else {
                        throw new Error('Please pass an Array of EventItemIds.');
                    }
                }
                function ReserveAndAddToPickList(EventId, EventItemIds) {
                    var Data = [];
                    Widgets.OrderItemsTable.find('.new-itemAdd').each(function () {
                        var TR = $(this);
                        var model = JSON.parse(decodeURIComponent(TR.attr('data-lt-model')));
                        var itemData = {
                            ItemId: model.ItemId,
                            Quantity: TR.hasClass("case-item") ? model.CaseExtendedQuantity : model.ItemQuantity,
                            CustomerUnitAmount: TR.hasClass("case-item") ? model.CaseUnitPrice : model.StandardUnitPrice,
                            Description: model.ItemDescription || null,
                            ShipFromLocationId: ApplicationOwnerShipFromId,
                            ShipToLocationId: Widgets.Store.find('option:selected').val(),
                            ShipViaId: model.ShipViaId || DefaultShipViaId,
                            ShipTermId: model.ShipTermId || null,
                            CarrierAccountNumber: model.CarrierAccountNumber || null,
                            AutoStockBehaviour: model.AutoStockBehaviour || 'Standard',
                            FlowControl: model.FlowControl || 'AutoReserve',
                            AmountType: model.ItemAmountType,
                            DiscountPercentage: model.DiscountPercentage || 0,
                            ClientIdentifier: model.ClientIdentifier || U.GenerateUniqueString(),
                        };
                        Data.push(itemData);
                    });

                    var eventObject = {
                        eventId: EventId,
                        shipFromLocationId: Data[0].ShipFromLocationId,
                        shipViaId: Data[0].ShipViaId
                    };

                    return ReserveEventItems(EventItemIds)
                        .then(() => U.AJAX('/API/inventory/PickListManagementItemTransactions/0?$filter=orderEventId eq ' + eventObject.eventId, 'GET', false, false, 'silent'))
                        .then(R => {
                            if (R.items.length) {
                                var ItemsNotInPickList = R.items.filter(IX => !IX.pickListEventId);
                                if (ItemsNotInPickList.length) {
                                    return U.AJAX(
                                        '/API/Inventory/AddItemsToPickListEvent/'
                                        + U.InnerJoin(ItemsNotInPickList, 'itemTransactionId', ',') + '/'
                                        + '-1/-1/'
                                        + eventObject.shipFromLocationId + '/'
                                        + PickListEventReviewStatusOptions[0].id + '/'
                                        + '-1/'
                                        + eventObject.shipViaId + '/'
                                        + '-1/null',
                                        'POST', false, false, 'silent'
                                    );
                                } 
                            }  
                        });
                }
                return function (EventId, EventItemIds) {
                    if (EventId && EventItemIds instanceof Array && EventItemIds.length) {
                        return ReserveAndAddToPickList(EventId, EventItemIds);
                    } else {
                        throw new Error('Please pass an EventId and an Array of EventItemIds.');
                    }
                };
            }();
            var SubmitOrder = function () {
                function AddEvent() {
                    var EventType = EventTypes.find(T => ['Sales Order'].indexOf(T.name) > -1).name;
                    var Route = null;
                    var Data = {
                        CustomColumns: [],
                        ReviewStatus: 0,
                        Tag1: Widgets.OrderEntryPoRef.val(),
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
                function AddEventItems(EventId) {
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
                    Widgets.OrderItemsTable.find('.new-itemAdd').each(function () {
                        var TR = $(this);
                        var model = JSON.parse(decodeURIComponent(TR.attr('data-lt-model')));
                        var itemData = {
                            ItemId: model.ItemId,
                            Quantity: TR.hasClass("case-item") ? model.CaseExtendedQuantity : model.ItemQuantity,
                            CustomerUnitAmount: TR.hasClass("case-item") ? model.CaseUnitPrice : model.StandardUnitPrice,
                            Description: model.ItemDescription || null,
                            ShipFromLocationId: ApplicationOwnerShipFromId,
                            ShipToLocationId: Widgets.Store.find('option:selected').val(),
                            ShipViaId: model.ShipViaId || DefaultShipViaId,
                            ShipTermId: model.ShipTermId || null,
                            CarrierAccountNumber: model.CarrierAccountNumber || null,
                            AutoStockBehaviour: model.AutoStockBehaviour || 'Standard',
                            FlowControl: model.FlowControl || 'AutoReserve',
                            AmountType: model.ItemAmountType,
                            SubAmountTypeId: model.ItemSubAmountTypeId,
                            DiscountPercentage: model.DiscountPercentage || 0,
                            ClientIdentifier: model.ClientIdentifier || U.GenerateUniqueString(),
                        };
                        Data.Items.push(itemData);
                    });
                    if (RetailerData.retailerAffiliate.remoteFreightItem) {
                        Data.Items.push({
                            ItemId: RetailerData.retailerAffiliate.remoteFreightItem.id,
                            Quantity: 1,
                            CustomerUnitAmount: RetailerData.retailerAffiliate.remoteFreightItem.msrp,
                            Description: RetailerData.retailerAffiliate.remoteFreightItem.description || null,
                            ShipFromLocationId: ApplicationOwnerShipFromId,
                            ShipToLocationId: Widgets.Store.find('option:selected').val(),
                            ShipViaId: DefaultShipViaId,
                            ShipTermId: null,
                            CarrierAccountNumber: null,
                            AutoStockBehaviour: 'Standard',
                            FlowControl: 'AutoReserve',
                            AmountType: RetailerData.retailerAffiliate.remoteFreightItem.amountType,
                            SubAmountTypeId: RetailerData.retailerAffiliate.remoteFreightItem.subAmountTypeId,
                            DiscountPercentage: 0,
                            ClientIdentifier: U.GenerateUniqueString(),
                        });
                    }
                    return U.AJAX(Route, 'POST', Data, false, 'silent', true);
                }
                return function (TakePayment) {
                    return AddEvent().then(function (eventId) {
                        return $.when(
                            TakePayment ? MakePayment(eventId) : { paymentSucceeded: true }
                        ).then(function (PR) {
                            if (PR.paymentSucceeded === true) {
                                return AddEventItems(eventId)
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

            Widgets.OrderEntrySubmitButton.on('click', function () {
                U.LoadingSplash.Show();
                var subtotal = parseFloat(Widgets.OrderItemsSubtotal.text().replace(/[^0-9.]/g, ''));
                var freight =
                    RetailerData.retailerAffiliate.remoteFreightItem
                        ? RetailerData.retailerAffiliate.remoteFreightItem.msrp || 0
                        : 0;
                var provinceId = RetailerData.locations.find(L => L.id == Widgets.Store.val()).provinceId;
                var GetTaxesPayload = $.map(Widgets.OrderItemsTable.find('.new-itemAdd'), function (Elem) {
                    var model = JSON.parse(decodeURIComponent($(Elem).attr('data-lt-model')));
                    return {
                        ExtendedAmount:
                            model.IsCaseItem
                                ? U.PrepMathForView(U.PrepMoneyForMath(model.CaseUnitPrice) * U.PrepMoneyForMath(model.CaseExtendedQuantity), 1)
                                : U.PrepMathForView(U.PrepMoneyForMath(model.StandardUnitPrice) * U.PrepMoneyForMath(model.ItemQuantity), 1),
                        ProvinceId: provinceId,
                        AmountType: model.ItemAmountType,
                        SubAmountTypeId: model.ItemSubAmountTypeId,
                        AffiliateId: RetailerData.retailerAffiliate.id,
                        DocumentType: DefaultDocTypeId
                    };
                });
                if (freight != 0) {
                    GetTaxesPayload.push({
                        ExtendedAmount: freight,
                        ProvinceId: provinceId,
                        AmountType: RetailerData.retailerAffiliate.remoteFreightItem.amountType,
                        SubAmountTypeId: RetailerData.retailerAffiliate.remoteFreightItem.subAmountTypeId,
                        AffiliateId: RetailerData.retailerAffiliate.id,
                        DocumentType: DefaultDocTypeId
                    });
                }
                U.AJAX(
                    '/api/Financial/GetTaxes', 'POST',
                    { Items: GetTaxesPayload }, false, 'silent', true
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

                    Widgets.RenderPaymentOptions().done(function () {
                        Widgets.PaymentModalBox.removeClass('non-visible');
                    });
                });

            });

            Widgets.OrderEntryRemoveOrderButton.on('click', function () {
                Widgets.ResetScreen();
            });

            Widgets.ResetScreen = function () {
                Widgets.OrderItemsTable.find('.new-itemAdd').each(function () {
                    var TR = $(this);
                    TR.find(".RemoveItem").trigger('click');
                });
                Widgets.Store.val("").change();
                Widgets.OrderEntryPoRef.val("");
            };

            Widgets.RenderPaymentOptions = function () {
                U.LoadingSplash.Show();
                Widgets.PaymentOptionsList.empty();
                return CCUtil.CreditCards.Refresh().then(() => {
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
                    U.LoadingSplash.Hide();
                });
            };

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
                    var EmailAddress =
                        RetailerData.locations.find(function (L) { return L.id == Widgets.Store.val() }).email
                        || RetailerData.retailerAffiliate.email
                        || CurrentUserDetails.email;
                    $.when(
                        paymentType != 'buying-group' || !RetailerData.buyingGroup.approvalRequired
                            ? PreProcessForWarehouse(eventId, eventItemIds)
                            : U.SendAlertToApprover(eventId, RetailerData.buyingGroup.id),
                        EmailAddress
                            ? U.SendSalesOrderConfirmation(eventId, RetailerData.retailerAffiliate.id ,EmailAddress, 'silent')
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
                Widgets.RenderCCBillingAddresses();
                Widgets.PaymentModalBox.addClass('non-visible');
                Widgets.AddCreditCardModal.removeClass('non-visible');


            });

            Widgets.PaymentModalBox.on('click', 'input:radio[name="payment-option"]', function () {
                Widgets.PaymentPlaceOrderButton.css('background', '').prop('disabled', false)
            });


            // Credit Card
            Widgets.AddCreditCardCancel =
                $('.oe-add-credit-card-cancel', Widgets.AddCreditCardModal).on('click', () => { Widgets.AddCreditCardModal.addClass('non-visible') });
            Widgets.AddCreditCardSave =
                $('.oe-add-credit-card-save', Widgets.AddCreditCardModal).on('click', function () {
                    if (!ValidateFields(Widgets.AddCreditCardModal)) {
                        return false;
                    }
                    var BillingAddressId = Widgets.AddCreditCardBillingAddresses.val() || null;
                    var BillingAddress =
                        BillingAddressId
                            ? RetailerData.locations.concat(RetailerData.billToLocations).find(L => L.id == BillingAddressId)
                            : {
                                address1: Widgets.AddCreditCardBillingAddress1.val().trim() || null,
                                address2: Widgets.AddCreditCardBillingAddress2.val().trim() || null,
                                cityName: Widgets.AddCreditCardBillingCity.val().trim() || null,
                                provinceId: parseInt(Widgets.AddCreditCardBillingProvince.val(), 10) || null,
                                countryId: Countries.find(C => C.code == 'Canada').id,
                                postalCode: Widgets.AddCreditCardBillingPostal.val().toUpperCase().trim().replace(/[^0-9A-Z\s]/g, '') || null,
                                phoneNumber: Widgets.AddCreditCardBillingPhone.val().replace(/[^0-9]/g, '') || null,
                                email: Widgets.AddCreditCardBillingEmail.val().trim() || null,
                            };
                    try {
                        U.LoadingSplash.Show();
                        CCUtil.CreditCards.Add(
                            CCUtil.GenerateModel(
                                BillingAddressId,
                                Widgets.AddCreditCardName.val().trim() || null,
                                Widgets.AddCreditCardNumber.val().replace(/[^0-9]/g, '') || null,
                                Widgets.AddCreditCardMonth.val() || null,
                                Widgets.AddCreditCardYear.val() || null,
                                Widgets.AddCreditCardCVV.val() || null,
                                BillingAddress.address1,
                                BillingAddress.address2 || '',
                                BillingAddress.cityName,
                                BillingAddress.provinceId,
                                BillingAddress.countryId,
                                BillingAddress.postalCode,
                                BillingAddress.phoneNumber,
                                BillingAddress.email
                            )
                        ).done(newCC => {
                            Widgets.AddCreditCardModal.addClass('non-visible');
                            Widgets.RenderPaymentOptions().done(function () {
                                Widgets.PaymentModalBox.removeClass('non-visible');
                            });
                        });
                    } catch (error) {
                        U.LoadingSplash.Hide();
                        U.Alert({
                            Message: error,
                            Type: 'Error',
                        });
                    }
                });

            Widgets.RenderCCBillingAddresses = function () {
                Widgets.AddCreditCardBillingAddresses.children(':gt(0)').remove();
                RetailerData.locations.concat(RetailerData.billToLocations).forEach(L => {
                    if (L) {
                        Widgets.AddCreditCardBillingAddresses.append(
                            `<option value="${L.id}" data-lt-data="${encodeURIComponent(JSON.stringify(L))}">
                                ${U.RenderAddress(L, Provinces, null, true, true, true)}
                            </option>`
                        );
                    }
                });
            };

            // Thank You
            Widgets.ThankYouModalBox.on('click', 'span.close-modal, button.zuc-btn-secondary', function () {
                Widgets.ResetScreen();
                Widgets.ThankYouModalBox.addClass('non-visible');
            });

            U.ShowUI();

        });
    });

})();