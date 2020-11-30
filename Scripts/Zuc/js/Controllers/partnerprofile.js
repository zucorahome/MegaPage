/*

    partnerprofile Controller for the View "partnerprofile"
    Copyright 2020, LimeTAC Inc. All rights reserved.

*/

(function () {

    var U = new LTPublicUtils();

    var CCUtil = null;

    $.when(
        $.when(
            LT.LTCodes.Find('AffiliateLocationRelationTypeOptions', 'code', 'BillToAddress'),
            U.AJAX('/API/Core/GetRetailerDatas', 'GET', false, false, 'silent').then(R => R)
        ).then((BillToRelType, Partner) => {
            CCUtil = new LT.CreditCardUtil(Partner.retailerAffiliate.id);
            return $.when(
                U.AJAX('/api/Core/Affiliates?$filter=id eq ' + Partner.retailerAffiliate.id, 'GET', false, false, 'silent')
                    .then(R => Partner.retailerAffiliate = R.items[0]),
                U.AJAX(`/API/Core/AffiliateLocations/-1/null/null/${BillToRelType.id}?geofenceIdListString=&$filter=affiliateId eq ${Partner.retailerAffiliate.id}`, 'GET', false, false, 'silent')
                    .then(R => R.items[0] ? U.AJAX('/API/FieldService/Locations?$filter=id eq ' + R.items[0].locationId, 'GET', false, false, 'silent') : new $.Deferred().resolve({ items: [{}] }))
                    .then(R => { Partner.retailerBillToLocation = R.items[0] }),
                CCUtil.CreditCards.Refresh(),
                (Partner.locations != null
                    ? U.AJAX('/API/FieldService/Locations?$filter=id eq ' + Partner.locations.map(L => L.id).join(' or id eq '), 'GET', false, false, 'silent')
                        .then(R => {
                            Partner.locations.forEach((L, I, A) => {
                                A[I] = R.items.find(RX => RX.id == L.id);
                            });
                        })
                    : {}),
                U.AJAX('/api/FieldService/GetBankAccountAsRepresentative/' + Partner.retailerAffiliate.id, 'GET', false, false, 'silent')
                    .then(R => { Partner.bankAccount = R || null }),
                U.AJAX('/api/MarketPartner/GetMarketPartnerPaymentPreferences/' + Partner.retailerAffiliate.id, 'GET', false, false, 'silent')
                    .then(R => { Partner.paymentPreferences = R })
            ).then(() => Partner);
        }),
        LT.LTCodes.Get('Languages'),
        LT.LTCodes.Get('Provinces'),
        LT.LTCodes.Find('LocationAccuracyOptions', 'code', 'Default'),
        LT.LTCodes.Find('AffiliateLocationRelationTypeOptions', 'code', 'BillToAddress'),
        LT.LTCodes.Find('AffiliateLocationRelationTypeOptions', 'code', 'ShipToAddress'),
        LT.LTCodes.Find('ContactTypes', 'code', 'MemberOf'),
        LT.LTCodes.Find('ActivityGroups', 'code', 'Approval Required'),
        LT.LTCodes.Get('BuyingGroups'),
        LT.LTCodes.Find('PreferredCommunicationOptions', 'code', 'TextMessage'),
        LT.LTCodes.Get('AffiliateEventTypeCommissionEarningPaymentMethodOptions'),
        LT.LTCodes.Get('AffiliateEventTypePlanRegistrationPaymentMethodOptions'),
        LT.LTCodes.Get('AffiliateEventTypeProductPurchasePaymentMethodOptions'),
        LT.LTCodes.Get('LocationCategories'),
        LT.LTCodes.Get('AffiliateBankAccountTypeOptions')
    ).then((Partner, Langs, Provinces, AccuracyDefault, RelTypeBillTo, RelTypeShipTo, BuyingGroupCT, ApprovalRequiredSE, BuyingGroups, CommPrefSMS, PaymentPrefsComm, PaymentPrefsPlan, PaymentPrefsProd, LocationCategories, AcctTypeOptions) => {
        $(function () {

            var Widgets = {};

            // Section 1: Company Info
            function PopulateHeader() {
                Widgets.Header.empty();
                Widgets.Header.append(
                    `<tr>
                        <td data-label="Name">
                            ${Partner.retailerAffiliate.fullName}<br />
                            ${Partner.retailerAffiliate.jobTitle || '<b>MISSING COMPANY NAME</b>'}
                        </td>
                        <td data-label="Lang Pref">
                            ${Partner.retailerAffiliate.preferredLanguageId
                                ? Langs.find(L => L.id == Partner.retailerAffiliate.preferredLanguageId).description
                                : '<b>MISSING LANG PREF</b>'}
                        </td>
                        <td data-label="HST/GST#">${Partner.retailerAffiliate.externalCode || '<b>MISSING HST/GST#</b>'}</td>
                        <td data-label="Buying Group">
                            ${Partner.buyingGroup
                                ? `${Partner.buyingGroup.name}<br />
                                   ${Partner.buyingGroup.memberId || '<b>MISSING MEMBER ID</b>'}`
                                : 'None'}
                        </td>
                        <td data-label="Edit"><a class="pp-header-edit fa fa-pencil-alt"></a></td>
                    </tr>`
                );
            }
            Widgets.Header = $('.pp-header tbody').on('click', '.pp-header-edit', () => { EditHeader() });
            Widgets.HeaderModal = $('.pp-header-edit-modal-container').on('click', '.close-modal', () => { Widgets.HeaderModal.addClass('non-visible') });
            var EditHeader = function () {
                var Fields = {
                    FullName: $('#pp-header-edit-full-name', Widgets.HeaderModal),
                    JobTitle: $('#pp-header-edit-job-title', Widgets.HeaderModal),
                    LangPref: $('#pp-header-edit-lang-pref', Widgets.HeaderModal).append(Langs.reduce((A, L) => A + `<option value="${L.id}">${L.description}</option>`, '')),
                    TaxNumber: $('#pp-header-edit-tax-number'),
                    BuyingGroup:
                        $('#pp-header-edit-buying-group')
                            .append(BuyingGroups.reduce((A, G) => A + `<option value="${G.id}">${G.fullName}</option>`, ''))
                            .on('change', function () {
                                $(this).val()
                                    ? Fields.MemberId.closest('div').show()
                                    : Fields.MemberId.closest('div').hide();
                            }),
                    MemberId: $('#pp-header-edit-member-id', Widgets.HeaderModal),
                    Cancel: $('.pp-header-edit-cancel').on('click', () => { Widgets.HeaderModal.addClass('non-visible') }),
                    Save:
                        $('.pp-header-edit-save').on('click', function () {
                            var AVals = {
                                jobTitle: Fields.JobTitle.val().trim() || null,
                                preferredLanguageId: Fields.LangPref.val() || null,
                                externalCode: Fields.TaxNumber.val().trim() || null,
                            };
                            var BGId = Fields.BuyingGroup.val() || null;
                            var BGMemberId = Fields.MemberId.val().trim() || null;
                            if (!AVals.jobTitle) {
                                Fields.JobTitle.select();
                                return false;
                            } else if (!AVals.preferredLanguageId) {
                                Fields.LangPref.select();
                                return false;
                            } else if (!AVals.externalCode) {
                                Fields.TaxNumber.select();
                                return false;
                            } else if (BGId && !BGMemberId) {
                                Fields.MemberId.select();
                                return false;
                            }
                            U.LoadingSplash.Show();
                            $.when(
                                U.AJAX(
                                    `/api/Core/Affiliates(${Partner.retailerAffiliate.id})`, 'PUT',
                                    $.extend({}, Partner.retailerAffiliate, AVals),
                                    false, 'silent', true
                                ).then(R => R.items[0]),
                                $.when(
                                    Partner.buyingGroup && Partner.buyingGroup.associationId
                                        ? U.AJAX(`/api/Core/AffiliateAssociations(${Partner.buyingGroup.associationId})`, 'DELETE', false, false, 'silent')
                                        : {}
                                ).then(
                                    () => BGId
                                        ? U.AJAX(
                                            '/api/Core/AffiliateAssociations', 'POST',
                                            {
                                                id: -1,
                                                affiliateId: Partner.retailerAffiliate.id,
                                                associatedAffiliateId: BGId,
                                                nickName: BGMemberId,
                                                contactTypeId: BuyingGroupCT.id,
                                                simpleEntityCodeId:
                                                    !Partner.buyingGroup || !Partner.buyingGroup.associationId || Partner.buyingGroup.id != BGId || Partner.buyingGroup.approvalRequired
                                                        ? ApprovalRequiredSE.id
                                                        : undefined,
                                            },
                                            false, 'silent', true
                                        ).then(R => ({
                                            approvalRequired: R.items[0].simpleEntityCodeId == ApprovalRequiredSE.id,
                                            associationId: R.items[0].id,
                                            email: BuyingGroups.find(function (G) { return G.id == R.items[0].associatedAffiliateId }).email,
                                            id: R.items[0].associatedAffiliateId,
                                            memberId: R.items[0].nickName,
                                            name: R.items[0].associatedAffiliateFullName,
                                        }))
                                        : new $.Deferred().resolve(null)
                                )
                            ).then((AR, BGR) => {
                                U.LoadingSplash.Hide();
                                $.extend(Partner.retailerAffiliate, AR);
                                Partner.buyingGroup = BGR;
                                PopulateHeader();
                                Widgets.HeaderModal.addClass('non-visible');
                            });
                        }),
                };
                return function () {
                    Fields.FullName.val(Partner.retailerAffiliate.fullName);
                    Fields.JobTitle.val(Partner.retailerAffiliate.jobTitle || '');
                    Fields.LangPref.val(Partner.retailerAffiliate.preferredLanguageId || '');
                    Fields.TaxNumber.val(Partner.retailerAffiliate.externalCode || '');
                    Fields.BuyingGroup.val(Partner.buyingGroup ? Partner.buyingGroup.id : '').trigger('change');
                    Fields.MemberId.val(Partner.buyingGroup ? Partner.buyingGroup.memberId : '');
                    Widgets.HeaderModal.removeClass('non-visible');
                };
            }();
            PopulateHeader();

            // Section 2: Bill To
            function PopulateBillingAddress() {
                Widgets.BillingAddress.empty();
                Widgets.BillingAddress.append(
                    `<tr>
                        <td data-label="Address" style="width: 90%;">
                            ${!$.isEmptyObject(Partner.retailerBillToLocation)
                                ? U.RenderAddress(Partner.retailerBillToLocation, Provinces, null, false, false, true)
                                : '<b>MISSING BILLING ADDRESS</b>'}
                        </td>
                        <td data-label="Edit" style="width: 10%;"><a class="pp-billing-address-edit fa fa-pencil-alt"></a></td>
                    </tr>`
                );
            }
            Widgets.BillingAddress = $('.pp-billing-address tbody').on('click', '.pp-billing-address-edit', () => { EditBillingAddress() });
            Widgets.BillingAddressModal = $('.pp-billing-address-edit-modal-container').on('click', '.close-modal', () => { Widgets.BillingAddressModal.addClass('non-visible') });
            var EditBillingAddress = function () {
                var Fields = {
                    Address1: $('#pp-billing-address-edit-address-1', Widgets.BillingAddressModal).on('change', () => { Fields.Address1.removeAttr('data-lt-latlng') }),
                    Autocomplete:
                        new LT.GoogleAutoComplete.Locate({
                            Element: $('#pp-billing-address-edit-address-1', Widgets.BillingAddressModal)[0],
                            LocateCallback: function (Loc) {
                                Fields.Address1.val(Loc.Address1 || '');
                                Loc.Latitude && Loc.Longitude
                                    ? Fields.Address1.attr('data-lt-latlng', `${Loc.Latitude},${Loc.Longitude}`)
                                    : Fields.Address1.removeAttr('data-lt-latlng');
                                Fields.City.val(Loc.CityName || '');
                                Fields.Province.val((Provinces.find(P => P.code == Loc.ProvinceName) || {}).id || '');
                                Fields.Postal.val(Loc.PostalCode || '');
                            },
                        }),
                    Address2: $('#pp-billing-address-edit-address-2', Widgets.BillingAddressModal),
                    City: $('#pp-billing-address-edit-city', Widgets.BillingAddressModal),
                    Province: $('#pp-billing-address-edit-province').append(Provinces.reduce((A, P) => A + `<option value="${P.id}" data-lt-country-id="${P.countryId}">${P.code}</option>`, '')),
                    Postal: $('#pp-billing-address-edit-postal', Widgets.BillingAddressModal),
                    Cancel: $('.pp-billing-address-edit-cancel').on('click', () => { Widgets.BillingAddressModal.addClass('non-visible') }),
                    Save:
                        $('.pp-billing-address-edit-save').on('click', function () {
                            var Vals = {
                                address1: Fields.Address1.val().trim() || null,
                                address2: Fields.Address2.val() || null,
                                cityName: Fields.City.val().trim() || null,
                                provinceId: Fields.Province.val() || null,
                                postalCode: Fields.Postal.val().trim() || null,
                                countryId: Fields.Province.val() ? parseInt(Fields.Province.children(':selected').attr('data-lt-country-id'), 10) : null,
                                latitude: Fields.Address1.val().trim() && Fields.Address1.attr('data-lt-latlng') ? parseFloat(Fields.Address1.attr('data-lt-latlng').split(',')[0]) : null,
                                longitude: Fields.Address1.val().trim() && Fields.Address1.attr('data-lt-latlng') ? parseFloat(Fields.Address1.attr('data-lt-latlng').split(',')[1]) : null,
                            };
                            if (!Vals.address1) {
                                Fields.Address1.select();
                                return false;
                            } else if (!Vals.cityName) {
                                Fields.City.select();
                                return false;
                            } else if (!Vals.provinceId) {
                                Fields.Province.select();
                                return false;
                            } else if (!Vals.postalCode) {
                                Fields.Postal.select();
                                return false;
                            }
                            U.LoadingSplash.Show();
                            $.when(
                                !$.isEmptyObject(Partner.retailerBillToLocation)
                                    ? U.AJAX(
                                        `/API/FieldService/Locations(${Partner.retailerBillToLocation.id})`, 'PUT',
                                        $.extend({}, Partner.retailerBillToLocation, Vals), false, 'silent', true
                                    )
                                    : U.AJAX(
                                        '/api/FieldService/GetLocationNameSuggestions', 'GET',
                                        { name: Partner.retailerAffiliate.fullName, id: -1 },
                                        false, 'silent'
                                    ).then(Names => U.AJAX(
                                        '/API/FieldService/Locations', 'POST',
                                        $.extend(
                                            {
                                                id: -1,
                                                name: Names[0],
                                                accuracy: AccuracyDefault.id,
                                                timeZone: Partner.retailerAffiliate.homeTimeZone,
                                                affiliateId: Partner.retailerAffiliate.id,
                                                relationType: RelTypeBillTo.id,
                                                isActive: true,
                                            },
                                            Vals
                                        ),
                                        false, 'silent', true
                                    ))
                            ).then(R => {
                                U.LoadingSplash.Hide();
                                $.extend(Partner.retailerBillToLocation, R.items[0]);
                                PopulateBillingAddress();
                                Widgets.BillingAddressModal.addClass('non-visible');
                            });
                        })
                };
                return function () {
                    if (!$.isEmptyObject(Partner.retailerBillToLocation)) {
                        Fields.Address1.val(Partner.retailerBillToLocation.address1 || '');
                        Partner.retailerBillToLocation.latitude && Partner.retailerBillToLocation.longitude
                            ? Fields.Address1.attr('data-lt-latlng', `${Partner.retailerBillToLocation.latitude},${Partner.retailerBillToLocation.longitude}`)
                            : Fields.Address1.removeAttr('data-lt-latlng');
                        Fields.Address2.val(Partner.retailerBillToLocation.address2 || '');
                        Fields.City.val(Partner.retailerBillToLocation.cityName || '');
                        Fields.Province.val(Partner.retailerBillToLocation.provinceId || '');
                        Fields.Postal.val(Partner.retailerBillToLocation.postalCode || '');
                    } else {
                        Fields.Address1.val('');
                        Fields.Address1.removeAttr('data-lt-latlng');
                        Fields.Address2.val('');
                        Fields.City.val('');
                        Fields.Province.val('');
                        Fields.Postal.val('');
                    }
                    Widgets.BillingAddressModal.removeClass('non-visible');
                };
            }();
            PopulateBillingAddress();

            // Section 3: Payment Prefs
            function PopulatePaymentPrefs() {
                Widgets.PaymentPrefs.empty();
                Widgets.PaymentPrefs.append(
                    `<tr>
                        <td data-label="Comm Earnings">
                            ${U.IsNumber(Partner.paymentPreferences.commissionEarnings)
                                ? PaymentPrefsComm.find(P => P.id == Partner.paymentPreferences.commissionEarnings).code
                                : 'None'}
                        </td>
                        <td data-label="Plan Registrations">
                            ${U.IsNumber(Partner.paymentPreferences.planRegistration)
                                ? PaymentPrefsPlan.find(P => P.id == Partner.paymentPreferences.planRegistration).code
                                : 'None'}
                        </td>
                        <td data-label="Prod Purchases">
                            ${U.IsNumber(Partner.paymentPreferences.productPurchases)
                                ? PaymentPrefsProd.find(P => P.id == Partner.paymentPreferences.productPurchases).code
                                : 'None'}
                        </td>
                        <td data-label="Edit"><a class="pp-payment-prefs-edit fa fa-pencil-alt"></a></td>
                    </tr>`
                );
            }
            Widgets.PaymentPrefs = $('.pp-payment-prefs tbody').on('click', '.pp-payment-prefs-edit', () => { EditPaymentPrefs() })
            Widgets.PaymentPrefsModal = $('.pp-payment-prefs-edit-modal-container').on('click', '.close-modal', () => { Widgets.PaymentPrefsModal.addClass('non-visible') });
            var EditPaymentPrefs = function () {
                var Fields = {
                    CommissionEarnings: $('[name="pp-commission-payment-pref"]'),
                    PlanRegistration: $('[name="pp-plan-payment-pref"]'),
                    ProductPurchases: $('[name="pp-product-payment-pref"]'),
                    Cancel: $('.pp-payment-prefs-edit-cancel').on('click', () => { Widgets.PaymentPrefsModal.addClass('non-visible') }),
                    Save:
                        $('.pp-payment-prefs-edit-save').on('click', (function () {
                            function GetPaymentPrefSelection(Inputs, Options) {
                                if (Inputs && Options) {
                                    let Code = Inputs.filter(':checked').first().val() || null;
                                    if (Code) {
                                        return Options.find(O => O.code == Code).id;
                                    }
                                }
                                return null;
                            }
                            return function () {
                                var Vals = {
                                    commissionEarnings: GetPaymentPrefSelection(Fields.CommissionEarnings, PaymentPrefsComm),
                                    planRegistration: GetPaymentPrefSelection(Fields.PlanRegistration, PaymentPrefsPlan),
                                    productPurchases: GetPaymentPrefSelection(Fields.ProductPurchases, PaymentPrefsProd)
                                };
                                if (!!Vals.commissionEarnings && !!Vals.planRegistration && !!Vals.productPurchases) {
                                    U.AJAX(
                                        '/api/MarketPartner/SaveMarketPartnerPaymentPreferences', 'POST',
                                        $.extend({}, Vals, { affiliateId: Partner.retailerAffiliate.id }),
                                        false, 'normal', true
                                    ).then(() => {
                                        $.extend(Partner.paymentPreferences, Vals);
                                        PopulatePaymentPrefs();
                                        Widgets.PaymentPrefsModal.addClass('non-visible');
                                    })
                                }
                            };
                        })())
                };
                function DisplayPaymentPref(Inputs, Options, ExistingId) {
                    if (Inputs) {
                        Inputs.prop('checked', false);
                        if (Options && U.IsNumber(ExistingId)) {
                            let Code = Options.find(O => O.id == ExistingId).code;
                            Inputs.filter(`[value="${Code}"]`).first().prop('checked', true);
                        }
                    }
                }
                return function () {
                    var Prefs = Partner.paymentPreferences;
                    DisplayPaymentPref(Fields.CommissionEarnings, PaymentPrefsComm, Prefs.commissionEarnings);
                    DisplayPaymentPref(Fields.PlanRegistration, PaymentPrefsPlan, Prefs.planRegistration);
                    DisplayPaymentPref(Fields.ProductPurchases, PaymentPrefsProd, Prefs.productPurchases);
                    Widgets.PaymentPrefsModal.removeClass('non-visible');
                };
            }();
            PopulatePaymentPrefs();

            // Section 4: ShipTos
            function PopulateShipTos() {
                Widgets.ShipTos.empty();
                Widgets.ShipTos.append(
                    Partner.locations
                        .sort((A, B) => {
                            var AN = A.name.toUpperCase();
                            var BN = B.name.toUpperCase();
                            return AN > BN ? 1 : AN < BN ? -1 : 0;
                        })
                        .reduce((A, L) => {
                            return A + `<tr data-lt-id="${L.id}">
                                <td data-label="Code">${L.id}</td>
                                <td data-label="Location Name">${L.name}</td>
                                <td data-label="Address">${U.RenderAddress(L, Provinces, null, false, false, true)}</td>
                                <td data-label="Phone">${L.phone || ''}</td>
                                <td data-label="Edit"><a class="pp-locations-edit fa fa-pencil-alt"></a></td>
                            </tr>`;
                        }, '')
                );
            }
            Widgets.ShipTos =
                $('.pp-locations tbody').on('click', '.pp-locations-edit', function () {
                    EditShipTo($(this).closest('tr').attr('data-lt-id'));
                });
            Widgets.AddShipTo = $('.pp-locations-add').on('click', () => { EditShipTo() });
            Widgets.ShipToModal = $('.pp-ship-to-modal-container').on('click', '.close-modal', () => { Widgets.ShipToModal.addClass('non-visible') });
            var EditShipTo = function () {
                var Fields = {
                    Name:
                        $('#pp-ship-to-name').on('change', function () {
                            var Id = parseInt(Widgets.ShipToModal.attr('data-lt-id') || -1, 10);
                            U.AJAX('/api/FieldService/GetLocationNameSuggestions', 'GET', { name: $(this).val().trim(), id: Id })
                                .then(R => { Fields.Name.val(R[0]) });
                        }),
                    Type: $('#pp-ship-to-type'),
                    Address1: $('#pp-ship-to-address-1').on('change', () => { Fields.Address1.removeAttr('data-lt-latlng') }),
                    Autocomplete:
                        new LT.GoogleAutoComplete.Locate({
                            Element: $('#pp-ship-to-address-1')[0],
                            LocateCallback: function (Loc) {
                                Fields.Address1.val(Loc.Address1 || '');
                                Loc.Latitude && Loc.Longitude
                                    ? Fields.Address1.attr('data-lt-latlng', `${Loc.Latitude},${Loc.Longitude}`)
                                    : Fields.Address1.removeAttr('data-lt-latlng');
                                Fields.City.val(Loc.CityName || '');
                                Fields.Province.val((Provinces.find(P => P.code == Loc.ProvinceName) || {}).id || '');
                                Fields.Postal.val(Loc.PostalCode || '');
                            },
                        }),
                    Address2: $('#pp-ship-to-address-2'),
                    City: $('#pp-ship-to-city'),
                    Province: $('#pp-ship-to-province').append(Provinces.reduce((A, P) => A + `<option value="${P.id}" data-lt-country-id="${P.countryId}">${P.code}</option>`, '')),
                    Postal: $('#pp-ship-to-postal'),
                    Phone: $('#pp-ship-to-phone'),
                    Cancel: $('.pp-ship-to-cancel').on('click', () => { Widgets.ShipToModal.addClass('non-visible') }),
                    Save:
                        $('.pp-ship-to-save').on('click', function () {
                            var Vals = {
                                id: parseInt(Widgets.ShipToModal.attr('data-lt-id') || -1, 10),
                                name: Fields.Name.val().trim() || null,
                                address1: Fields.Address1.val().trim() || null,
                                address2: Fields.Address2.val().trim() || null,
                                cityName: Fields.City.val().trim() || null,
                                provinceId: Fields.Province.val() || null,
                                countryId: Fields.Province.val() ? parseInt(Fields.Province.children(`:selected`).attr('data-lt-country-id'), 10) : null,
                                postalCode: Fields.Postal.val().trim() || null,
                                latitude: Fields.Address1.val().trim() && Fields.Address1.attr('data-lt-latlng') ? parseFloat(Fields.Address1.attr('data-lt-latlng').split(',')[0]) : null,
                                longitude: Fields.Address1.val().trim() && Fields.Address1.attr('data-lt-latlng') ? parseFloat(Fields.Address1.attr('data-lt-latlng').split(',')[1]) : null,
                                phoneNumber: Fields.Phone.val().replace(/[^0-9]/g, '') || null,
                                locationCategoryId: Fields.Type.val() ? LocationCategories.find(C => C.code == Fields.Type.val()).id : null
                            };
                            if (!Vals.name) {
                                Fields.Name.select();
                                return false;
                            } else if (!Vals.address1) {
                                Fields.Address1.select();
                                return false;
                            } else if (!Vals.cityName) {
                                Fields.City.select();
                                return false;
                            } else if (!Vals.provinceId) {
                                Fields.Province.select();
                                return false;
                            } else if (!Vals.postalCode) {
                                Fields.Postal.select();
                                return false;
                            } else if (!Vals.phoneNumber) {
                                Fields.Phone.select();
                                return false;
                            } else if (!Vals.locationCategoryId) {
                                Fields.Type.select();
                                return false;
                            }
                            U.LoadingSplash.Show();
                            U.AJAX('/api/FieldService/GetLocationNameSuggestions', 'GET', { name: Vals.name, id: Vals.id }, false, 'silent')
                                .then(R => { Vals.name = R[0] })
                                .then(() => {
                                    if (Vals.id > 0) { // update
                                        let L = Partner.locations.find(L => L.id == Vals.id);
                                        return U.AJAX(
                                            `/api/FieldService/Locations(${Vals.id})`, 'PUT',
                                            $.extend({}, L, Vals), false, 'silent', true
                                        ).then(R => { $.extend(L, R.items[0]) });
                                    } else { // add
                                        Vals.accuracy = AccuracyDefault.id;
                                        Vals.timeZone = Partner.retailerAffiliate.homeTimeZone;
                                        Vals.affiliateId = Partner.retailerAffiliate.id;
                                        Vals.relationType = RelTypeShipTo.id;
                                        return U.AJAX(
                                            '/api/FieldService/Locations', 'POST',
                                            Vals, false, 'silent', true
                                        ).then(R => {
                                            Partner.locations.push(R.items[0]);
                                        });
                                    }
                                })
                                .then(() => {
                                    U.LoadingSplash.Hide();
                                    PopulateShipTos();
                                    Widgets.ShipToModal.addClass('non-visible');
                                });
                        })
                };
                return function (Id) {
                    var Data = {};
                    Widgets.ShipToModal.removeAttr('data-lt-id');
                    if (!!Id) {
                        Data = Partner.locations.find(L => L.id == Id);
                        Widgets.ShipToModal.attr('data-lt-id', Data.id);
                    }
                    Fields.Name.val(Data.name || '');
                    Fields.Type.val(Data.locationCategoryId ? LocationCategories.find(C => C.id == Data.locationCategoryId).code : '');
                    Fields.Address1.val(Data.address1 || '');
                    Data.latitude && Data.longitude
                        ? Fields.Address1.attr('data-lt-latlng', `${Data.latitude},${Data.longitude}`)
                        : Fields.Address1.removeAttr('data-lt-latlng');
                    Fields.Address2.val(Data.address2 || '');
                    Fields.City.val(Data.cityName || '');
                    Fields.Province.val(Data.provinceId || '');
                    Fields.Postal.val(Data.postalCode || '');
                    Fields.Phone.val(Data.phoneNumber || '');
                    Widgets.ShipToModal.removeClass('non-visible');
                };
            }();
            PopulateShipTos();

            // Section 5: Bank Account
            function PopulateBankAccount() {
                Widgets.BankAccount.empty();
                if (Partner.bankAccount) {
                    Widgets.BankAccount.append(
                        `<tr data-lt-model="${encodeURIComponent(JSON.stringify(Partner.bankAccount))}">
                            <td data-label="Transit">${Partner.bankAccount.transitNumber || '<p class="u-transparent"></p>'}</td>
                            <td data-label="Institution">${Partner.bankAccount.institutionNumber || '<p class="u-transparent"></p>'}</td>
                            <td data-label="Account">${Partner.bankAccount.accountNumber || '<p class="u-transparent"></p>'}</td>
                            <td data-label="Edit"><a class="pp-bank-account-edit fa fa-pencil-alt"></a></td>
                        </tr>`
                    );
                }
            }
            Widgets.BankAccount = $('.pp-bank-account tbody').on('click', '.pp-bank-account-edit', () => { EditBankAccount() });
            Widgets.BankAccountModal = $('.pp-bank-account-edit-modal-container').on('click', '.close-modal', () => { Widgets.BankAccountModal.addClass('non-visible') });
            var EditBankAccount = function () {
                var Fields = {
                    Transit: $('#pp-bank-account-edit-transit'),
                    Institution: $('#pp-bank-account-edit-institution'),
                    Account: $('#pp-bank-account-edit-account'),
                    Cancel: $('.pp-bank-account-edit-cancel').on('click', () => { Widgets.BankAccountModal.addClass('non-visible') }),
                    Save:
                        $('.pp-bank-account-edit-save').on('click', function () {
                            var Vals = {
                                affiliateId: Partner.retailerAffiliate.id,
                                transitNumber: Fields.Transit.val().trim() || null,
                                institutionNumber: Fields.Institution.val().trim() || null,
                                accountNumber: Fields.Account.val().trim() || null,
                                accountType: Fields.Account.attr('data-lt-account-type') || AcctTypeOptions.find(T => T.code == 'EFT').id,
                                locationId: null
                            };
                            if (!Vals.transitNumber) {
                                Fields.Transit.select();
                                return false;
                            } else if (!Vals.institutionNumber) {
                                Fields.Institution.select();
                                return false;
                            } else if (!Vals.accountNumber) {
                                Fields.Account.select();
                                return false;
                            }
                            U.AJAX('/api/FieldService/AddOrUpdateAffiliateBankAccount', 'POST', Vals, false, 'normal', true)
                                .then(() => {
                                    if (!Partner.bankAccount) Partner.bankAccount = {};
                                    $.extend(Partner.bankAccount, Vals);
                                    PopulateBankAccount();
                                    Widgets.BankAccountModal.addClass('non-visible');
                                });
                        })
                };
                return function () {
                    var Acct = Partner.bankAccount || {};
                    Fields.Transit.val(Acct.transitNumber || '');
                    Fields.Institution.val(Acct.institutionNumber || '');
                    Fields.Account.val(Acct.accountNumber || '');
                    U.IsNumber(Acct.accountType)
                        ? Fields.Account.attr('data-lt-account-type', Acct.accountType)
                        : Fields.Account.removeAttr('data-lt-account-type');
                    Widgets.BankAccountModal.removeClass('non-visible');
                };
            }();
            PopulateBankAccount();

            // Section 6: Credit Cards
            function PopulateCreditCards() {
                Widgets.CreditCardList.empty();
                Widgets.CreditCardList.append(
                    CCUtil.CreditCards.Get().reduce(
                        (A, M) => A
                            + `<li data-lt-id="${M.id}">
                                ${U.GenerateCreditCardUI(M, Provinces, null, false, true)}
                            </li>`,
                        ''
                    )
                );
            }
            Widgets.CreditCardList =
                $('.pp-credit-cards')
                    .on('click', '.credit-card-heading', function () {
                        $(this).next().toggle();
                    })
                    .on('click', '.su-credit-cards-remove', function () {
                        var ALId = parseInt($(this).closest('li').attr('data-lt-id'), 10);
                        U.LoadingSplash.Show();
                        CCUtil.CreditCards.Delete(ALId).then(
                            R => {
                                U.LoadingSplash.Hide();
                                PopulateCreditCards();
                            },
                            (JQXHR, Status, Err) => {
                                U.LoadingSplash.Hide();
                                if (!JQXHR && Err) alert(Err);
                            }
                        );
                    })
                    .on('click', '.su-credit-cards-edit', function () {
                        EditCreditCard($(this).closest('li').attr('data-lt-id'));
                    });
            Widgets.AddCreditCard = $('.pp-credit-cards-add').on('click', () => { EditCreditCard() });
            Widgets.CreditCardModal = $('.pp-credit-card-edit-modal-container').on('click', '.close-modal', () => { Widgets.CreditCardModal.addClass('non-visible') });
            var EditCreditCard = function () {
                var Fields = {
                    NameOnCard: $('#pp-credit-card-edit-name-on-card'),
                    CardNumber: $('#pp-credit-card-edit-card-number'),
                    ExpiryMonth: $('#pp-credit-card-edit-expiry-month'),
                    ExpiryYear:
                        $('#pp-credit-card-edit-expiry-year').append(
                            [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15].reduce((function () {
                                var CurrentYear = new Date().getFullYear();
                                return (A, Addend) => {
                                    var YYYY = CurrentYear + Addend;
                                    return A + `<option value="${YYYY}">${YYYY}</option>`;
                                };
                            })(), '')
                        ),
                    SecurityCode: $('#pp-credit-card-edit-security-code'),
                    IsDefault: $('#pp-credit-card-edit-is-default'),
                    BillingHelper:
                        $('#pp-credit-card-edit-billing-helper').on('change', function () {
                            if (Fields.BillingHelper.val()) {
                                var Data = JSON.parse(decodeURIComponent(Fields.BillingHelper.children(':selected').attr('data-lt-data')));
                                Fields.BillingAddress1.val(Data.address1 || '');
                                Fields.BillingAddress2.val(Data.address2 || '');
                                Fields.BillingCity.val(Data.cityName || '');
                                Fields.BillingProvince.val(Data.provinceId || '');
                                Fields.BillingPostal.val(Data.postalCode || '');
                                Fields.BillingPhone.val(Data.phoneNumber || '');
                                Fields.BillingEmail.val(Data.email || '');
                            }
                        }),
                    BillingAddress1: $('#pp-credit-card-edit-billing-address-1'),
                    BillingAddress2: $('#pp-credit-card-edit-billing-address-2'),
                    BillingCity: $('#pp-credit-card-edit-billing-city'),
                    BillingProvince: $('#pp-credit-card-edit-billing-province').append(Provinces.reduce((A, P) => A + `<option value="${P.id}" data-lt-country-id="${P.countryId}">${P.code}</option>`, '')),
                    BillingPostal: $('#pp-credit-card-edit-billing-postal'),
                    BillingPhone: $('#pp-credit-card-edit-billing-phone'),
                    BillingEmail: $('#pp-credit-card-edit-billing-email'),
                    Cancel: $('.pp-credit-card-edit-cancel').on('click', () => { Widgets.CreditCardModal.addClass('non-visible') }),
                    Save:
                        $('.pp-credit-card-edit-save').on('click', function () {
                            var NameOnCard = Fields.NameOnCard.val().trim() || null;
                            var CardNumber = Fields.CardNumber.val().replace(/[^0-9]/g, '') || null;
                            var ExpiryYear = Fields.ExpiryYear.val() || null;
                            var ExpiryMonth = Fields.ExpiryMonth.val() || null;
                            var SecurityCode = Fields.SecurityCode.val().replace(/[^0-9]/g, '') || null;
                            var Address1 = Fields.BillingAddress1.val().trim() || null;
                            var Address2 = Fields.BillingAddress2.val().trim() || null;
                            var City = Fields.BillingCity.val().trim() || null;
                            var ProvinceId = Fields.BillingProvince.val() || null;
                            var CountryId = Fields.BillingProvince.val() ? parseInt(Fields.BillingProvince.children(':selected').attr('data-lt-country-id'), 10) : null;
                            var PostalCode = Fields.BillingPostal.val().trim() || null;
                            var Phone = Fields.BillingPhone.val().trim() || null;
                            var Email = Fields.BillingEmail.val().trim() || null;
                            if (!NameOnCard) {
                                Fields.NameOnCard.select();
                                return false;
                            } else if (!CardNumber || CardNumber.length < 8 || CardNumber.length > 19) {
                                Fields.CardNumber.select();
                                return false;
                            } else if (!ExpiryMonth) {
                                Fields.ExpiryMonth.select();
                                return false;
                            } else if (!ExpiryYear) {
                                Fields.ExpiryYear.select();
                                return false;
                            } else if (!SecurityCode || SecurityCode.length < 3 || SecurityCode.length > 4) {
                                Fields.SecurityCode.select();
                                return false;
                            } else if (!Address1) { 
                                Fields.BillingAddress1.select();
                                return false;
                            } else if (!City) {
                                Fields.BillingCity.select();
                                return false;
                            } else if (!ProvinceId) {
                                Fields.BillingProvince.select();
                                return false;
                            } else if (!PostalCode) {
                                Fields.BillingPostal.select();
                                return false;
                            } else if (!Phone) {
                                Fields.BillingPhone.select();
                                return false;
                            } else if (Email && !LTAppSettingValidationPatterns.Email.test(Email)) {
                                Fields.BillingEmail.select();
                                return false;
                            }
                            var ALId = parseInt(Widgets.CreditCardModal.attr('data-lt-id') || 0, 10) || null;
                            if (ALId) { // update
                                // TODO
                            } else { // add
                                U.LoadingSplash.Show();
                                CCUtil.CreditCards.Add(
                                    CCUtil.GenerateModel(
                                        null,
                                        NameOnCard, CardNumber, ExpiryMonth, ExpiryYear, SecurityCode,
                                        Address1, Address2, City, ProvinceId, CountryId, PostalCode,
                                        Phone, Email
                                    )
                                ).then(
                                    R => {
                                        U.LoadingSplash.Hide();
                                        PopulateCreditCards();
                                        Widgets.CreditCardModal.addClass('non-visible');
                                    },
                                    (JQXHR, Status, Err) => {
                                        U.LoadingSplash.Hide();
                                        if (!JQXHR && Err) alert(Err);
                                    }
                                );
                            }
                        })
                };
                return function (Id) {
                    var Data = {};
                    Widgets.CreditCardModal.removeAttr('data-lt-id');
                    if (!!Id) {
                        Data = CCUtil.CreditCards.Get().find(M => M.id == Id);
                        Widgets.CreditCardModal.attr('data-lt-id', Id);
                    }
                    Fields.NameOnCard.val(Data.cardholderName || '');
                    Fields.CardNumber.val(Data.maskedCreditCardNumber || '')
                    Fields.ExpiryMonth.val(Data.expiry ? Data.expiry.substr(5, 2) : '');
                    Fields.ExpiryYear.val(Data.expiry ? Data.expiry.substr(0, 4) : '');
                    Fields.SecurityCode.val('');
                    Fields.IsDefault.prop('checked', Data.isActive || false);
                    Fields.BillingHelper.children(':gt(0)').remove();
                    Fields.BillingHelper.append(
                        [Partner.retailerBillToLocation].concat(Partner.locations)
                            .sort((A, B) => {
                                var AN = A.name.toUpperCase();
                                var BN = B.name.toUpperCase();
                                return AN > BN ? 1 : AN < BN ? -1 : 0;
                            })
                            .reduce(
                                (A, L) => A
                                    + `<option value="${L.id}" data-lt-data="${encodeURIComponent(JSON.stringify(L))}">
                                        ${U.RenderAddress(L, Provinces, null, true, true, true)}
                                    </option>`,
                                ''
                            )
                    );
                    Fields.BillingAddress1.val(Data.address1 || '');
                    Fields.BillingAddress2.val(Data.address2 || '');
                    Fields.BillingCity.val(Data.city || '');
                    Fields.BillingProvince.val(Data.provinceId || '');
                    Fields.BillingPostal.val(Data.postalCode || '');
                    Fields.BillingPhone.val(Data.phone || '');
                    Fields.BillingEmail.val(Data.email || '');
                    Widgets.CreditCardModal.removeClass('non-visible');
                };
            }();
            PopulateCreditCards();

            // Section 7: Associates
            function PopulatePersonList() {
                Widgets.PersonList.empty();
                if (Partner.associates instanceof Array) {
                    Widgets.PersonList.append(
                        Partner.associates
                            .reduce(
                                (A, Affl, I, All) => {
                                    if (!A.find(Affl2 => Affl2.id == Affl.id)) { // unique so far
                                        // get any duplicates and reduce all locationId fields to locationIds array
                                        Affl.locationIds = All.filter(Affl2 => Affl2.id == Affl.id).map(Affl2 => Affl2.locationId);
                                        delete Affl.locationId;
                                        A.push(Affl);
                                    }
                                    return A;
                                },
                                []
                            )
                            .sort((A, B) => {
                                var AN = `${A.firstName} ${A.lastName}`.toUpperCase();
                                var BN = `${B.firstName} ${B.lastName}`.toUpperCase();
                                return AN < BN ? -1 : AN > BN ? 1 : 0;
                            })
                            .reduce(
                                (A, Person) => A +=
                                    `<tr data-lt-affiliate-id="${Person.id}" data-lt-affiliate="${encodeURIComponent(JSON.stringify(Person))}">
                                        <td data-label="Name">${Person.firstName} ${Person.lastName}</td>
                                        <td data-label="Username">${Person.username}</td>
                                        <td data-label="Status">${Person.isActive ? 'Active' : '<span style="color: #c50000;">Inactive</span>'}</td>
                                        <td data-label="Role">${Person.jobTitle || ''}</td>
                                        <td data-label="Order Products"><p class="u-transparent">none</p></td>
                                        <td data-label="Plans: Register">${Person.roles.some(R => R.name == 'M-Plan Registration') ? '<i class="fa fa-check grey-text"></i>' : '<p class="u-transparent">none</p>'}</td>
                                        <td data-label="Plans: Modify">${Person.roles.some(R => R.name == 'C-Plan Inquiry-Modify Plan') ? '<i class="fa fa-check grey-text"></i>' : '<p class="u-transparent">none</p>'}</td>
                                        <td data-label="Plans: Cancel">${Person.roles.some(R => R.name == 'C-Plan Inquiry-Cancel Plan') ? '<i class="fa fa-check grey-text"></i>' : '<p class="u-transparent">none</p>'}</td>
                                        <td data-label="Smarter Living Plans: Enroll"><p class="u-transparent">none</p></td>
                                        <td data-label="Inquiry/Reporting: Orders"><p class="u-transparent">none</p></td>
                                        <td data-label="Inquiry/Reporting: Plans">${Person.roles.some(R => R.name == 'M-Plan Inquiry') ? '<i class="fa fa-check grey-text"></i>' : '<p class="u-transparent">none</p>'}</td>
                                        <td data-label="Inquiry/Reporting: Success Tracker"><p class="u-transparent">none</p></td>
                                        <td data-label="Edit"><a class="contact-form-edit"><i class="fa fa-pencil-alt"></i></a></td>
                                    </tr>`,
                                ''
                            )
                    );
                }
            }
            Widgets.AddPerson = $('.pp-people-add').on('click', () => { EditPerson() });
            Widgets.PersonList = $('.pp-people tbody').on('click', '.contact-form-edit', function () {
                EditPerson(
                    JSON.parse(decodeURIComponent($(this).closest('tr').attr('data-lt-affiliate')))
                );
            });
            Widgets.PersonModal = $('.contacts-form-modal').on('click', 'h2', () => { Widgets.PersonModal.addClass('non-visible') });
            var EditPerson = function () {
                var GetUniqueFullName = function () {
                    var AttemptCount = 0;
                    return function (FullName, Recur) {
                        if (!Recur) AttemptCount = 0;
                        if (FullName) {
                            AttemptCount++;
                            if (AttemptCount < 4) {
                                U.LoadingSplash.Show();
                                return $.when(
                                    U.AJAX(`/API/Account/DoesUserNameExist/${FullName}/`, 'GET', false, false, 'silent').then(R => !R),
                                    U.AJAX(`/API/FieldService/GetAffiliateFullNameSuggestions?fullName=${FullName}&id=-1`, 'GET', false, false, 'silent').then(R => R[0] === FullName)
                                ).then((UsernameOK, FullNameOK) => {
                                    if (UsernameOK && FullNameOK) {
                                        U.LoadingSplash.Hide();
                                        return new $.Deferred().resolve(FullName);
                                    } else {
                                        return GetUniqueFullName(FullName + U.GetRandomIntegerInRange(1, 99), true);
                                    }
                                });
                            } else {
                                return new $.Deferred().resolve('');
                            }
                        }
                    };
                }();
                var Fields = {
                    FirstName: $('#pp-person-edit-first-name', Widgets.PersonModal),
                    LastName: $('#pp-person-edit-last-name', Widgets.PersonModal),
                    Email:
                        $('#pp-person-edit-email', Widgets.PersonModal).on('change', function () {
                            var Email = Fields.Email.val().trim() || null;
                            if (Email) {
                                GetUniqueFullName(Email).then(R => { Fields.Username.val(R) });
                            }
                        }),
                    Phone: $('#pp-person-edit-phone', Widgets.PersonModal),
                    Username:
                        $('#pp-person-edit-username', Widgets.PersonModal).on('change', function () {
                            var UN = Fields.Username.val().trim() || null;
                            if (UN) {
                                GetUniqueFullName(UN).then(R => { Fields.Username.val(R) });
                            }
                        }),
                    IsActive: $('#pp-person-edit-is-active', Widgets.PersonModal),
                    Locations: $('#pp-person-edit-locations', Widgets.PersonModal),
                    JobTitle: $('#pp-person-edit-job-title', Widgets.PersonModal),
                    LangPref: $('#pp-person-edit-lang-pref', Widgets.PersonModal).append(Langs.reduce((A, L) => A + `<option value="${L.id}">${L.description}</option>`, '')),
                    Permissions:
                        $('[name="pp-person-edit-permission"]', Widgets.PersonModal).on('change', function () {
                            var CB = $(this);
                            if (['C-Plan Inquiry-Modify Plan', 'C-Plan Inquiry-Cancel Plan'].indexOf(CB.attr('data-lt-role-name')) > -1 && CB.is(':checked')) {
                                Fields.Permissions.filter('[data-lt-role-name="M-Plan Inquiry"]').prop('checked', true);
                            }
                        }),
                    Cancel: $('.person-cancel-btn', Widgets.PersonModal).on('click', () => { Widgets.PersonModal.addClass('non-visible') }),
                    Save:
                        $('.person-save-btn', Widgets.PersonModal).on('click', function () {
                            var IsValid = ValidateFields(Widgets.PersonModal);
                            if (!IsValid) return false;
                            var Data = {
                                AffiliateMarketSegmentId: Partner.affiliateMarketSegmentId,
                                AdvisorId: parseInt(Widgets.PersonModal.attr('data-lt-affiliate-id'), 10),
                                AdvisorFirstName: Fields.FirstName.val().trim() || null,
                                AdvisorLastName: Fields.LastName.val().trim() || null,
                                PartnerId: Partner.retailerAffiliate.id,
                                Timezone: Partner.retailerAffiliate.homeTimeZone,
                                Email: Fields.Email.val().trim() || null,
                                MobilePhone: Fields.Phone.val().replace(/[^0-9]/g, '') || null,
                                LanguageId: Fields.LangPref.val() || null,
                                CurrencyId: Partner.retailerAffiliate.currencyId,
                                Title: Fields.JobTitle.val() || null,
                                PreferredCommunication: CommPrefSMS.id,
                                IsActive: Fields.IsActive.is(':checked'),
                                LocationIdList: Fields.Locations.val(),
                                SelectedRoleList:
                                    $.map(
                                        Fields.Permissions,
                                        function (Elem) {
                                            var CB = $(Elem);
                                            if (CB.is(':checked')) {
                                                var Role = CB.attr('data-lt-role-name');
                                                return AvailableRoles.find(R => R.name == Role).id;
                                            }
                                        }
                                    ).reduce((A, Id) => {
                                        if (A.indexOf(Id) < 0) {
                                            A.push(Id);
                                        }
                                        return A;
                                    }, [
                                        AvailableRoles.find(R => R.name == 'M-Advisor Welcome').id,
                                        AvailableRoles.find(R => R.name == 'M-Plan Activity').id,
                                        AvailableRoles.find(R => R.name == 'M-SPS Profile').id
                                    ])
                            };
                            var AfflAcctGeneration = new $.Deferred().resolve();
                            if (Data.AdvisorId == -1) {
                                let Username = Fields.Username.val().trim() || null;
                                if (!Username) {
                                    Fields.Username.select();
                                    return false;
                                }
                                U.LoadingSplash.Show();
                                AfflAcctGeneration =
                                    U.AJAX(
                                        '/api/Account/CreateNewExternalUserAccountForNewAffiliate', 'POST',
                                        {
                                            firstName: Data.AdvisorFirstName,
                                            lastName: Data.AdvisorLastName,
                                            fullName: Username,
                                            userName: Username,
                                            email: Data.Email,
                                            currentTimeZoneId: Data.Timezone,
                                            homeTimeZoneId: Data.Timezone,
                                            currencyId: Data.CurrencyId,
                                            alertId: Math.max(parseInt(Fields.JobTitle.children(':selected').attr('data-lt-alert-id'), 10), 0) || null
                                        },
                                        false, 'silent', true
                                    ).then(R => {
                                        // set for call to EditAdvisorAccount
                                        Data.AdvisorId = R.affiliateId;
                                        // set in case call to EditAdvisorAccount fails, so user can press "Save" again
                                        Widgets.PersonModal.attr('data-lt-affiliate-id', Data.AdvisorId);
                                    });
                            }
                            U.LoadingSplash.Show();
                            AfflAcctGeneration
                                .then(() => U.AJAX('/api/Account/EditAdvisorAccount', 'POST', Data, false, 'silent', true))
                                .then(() => U.AJAX('/api/Core/GetRetailerDatas', 'GET', false, false, 'silent'))
                                .then(R => {
                                    U.LoadingSplash.Hide();
                                    Partner.associates = R.associates;
                                    PopulatePersonList();
                                    Widgets.PersonModal.addClass('non-visible');
                                    if (Data.IsActive === true && Fields.IsActive.attr('data-lt-initial-state') === 'false') {
                                        U.Alert({ Message: 'The user has been contacted with reactivation instructions. The account will become Active after the user completes reactivation.' });
                                    }
                                });
                        })
                };
                var AlertIdPromise =
                    U.AJAX(
                        `/api/Core/Alerts?$filter=name eq '${$.map(Fields.JobTitle.children(), Elem => $(Elem).attr('value')).filter(N => !!N).join("' or name eq '")}' and isEnabled eq true`,
                        'GET', false, false, 'silent'
                    ).then(
                        R => {
                            var Map = R.items.reduce((A, O) => { A[O.name] = O.id; return A; }, {});
                            Fields.JobTitle.children().each(function () {
                                var C = $(this);
                                C.attr('data-lt-alert-id', Map[C.attr('value')] || -1);
                            });
                        },
                        () => { Fields.JobTitle.children().attr('data-lt-alert-id', -1) }
                    );
                return function (P) {
                    AlertIdPromise.always(() => {
                        if (!P) P = {};
                        Widgets.PersonModal.attr('data-lt-affiliate-id', P.id || -1);
                        Fields.FirstName.val(P.firstName || '');
                        Fields.LastName.val(P.lastName || '');
                        Fields.Username.val(P.username || '').prop('disabled', !!P.username);
                        var IsActive = typeof P.isActive == 'boolean' ? P.isActive : true;
                        Fields.IsActive.prop('checked', IsActive).attr('data-lt-initial-state', IsActive);
                        Fields.Locations.empty().append(Partner.locations.reduce((A, L) => A + `<option value="${L.id}">${L.name}</option>`, '')).val(P.locationIds || '');
                        Fields.JobTitle.val(P.jobTitle || '');
                        Fields.Email.val(P.email || '');
                        Fields.Phone.val(P.mobilePhone || P.homePhone || P.workPhone || '');
                        Fields.LangPref.val(P.preferredLanguageId || '');
                        Fields.Permissions.each(function () {
                            var CB = $(this);
                            var Role = CB.attr('data-lt-role-name');
                            CB.prop(
                                'checked',
                                !CB.is('[disabled]') && !!P.roles && !!P.roles.length && P.roles.some(R => R.name == Role)
                            );
                        });
                        Widgets.PersonModal.removeClass('non-visible');
                        Fields.FirstName.select();
                    });
                };
            }();
            PopulatePersonList();

            U.ShowUI();

        });
    });

})();