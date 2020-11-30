/*

    repprofile Controller for the View "repprofile"
    Copyright 2019, LimeTAC Inc. All rights reserved.

*/

(function () {

    var U = new LTPublicUtils();

    $.when(
        LT.LTCodes.Get('CurrentUserDetails')
            .then(R => {
                var Rep = {};
                return $.when(
                    U.AJAX('/api/Core/Affiliates?$filter=id eq ' + R.id, 'GET', false, false, 'silent').then(R => { Rep.affiliate = R.items[0] }),
                    LT.LTCodes.Find('AffiliateLocationRelationTypeOptions', 'code', 'HomeLocation')
                        .then(RelType => U.AJAX(`/API/Core/AffiliateLocations/-1/null/null/${RelType.id}?geofenceIdListString=&$filter=affiliateId eq ${R.id}`, 'GET', false, false, 'silent'))
                        .then(R => R.items[0] ? U.AJAX('/API/FieldService/Locations?$filter=id eq ' + R.items[0].locationId, 'GET', false, false, 'silent') : new $.Deferred().resolve({ items: [{}] }))
                        .then(R => { Rep.homeLocation = R.items[0] }),
                    U.AJAX('/api/FieldService/GetCurrentUserBankAccount', 'GET', false, false, 'silent')
                        .then(R => { Rep.bankAccount = R || {} }),
                    U.AJAX('/api/FieldService/GetMarketSegmentsUserRepresents', 'GET', false, false, 'silent')
                        .then(R => { Rep.marketSegments = R || [] })
                ).then(() => Rep);
            }),
        LT.LTCodes.Get('Provinces').then(R => R.sort((A, B) => { var AU = A.code.toUpperCase(), BU = B.code.toUpperCase(); return AU > BU ? 1 : AU < BU ? -1 : 0; })),
        LT.LTCodes.Get('Countries'),
        LT.LTCodes.Find('LocationAccuracyOptions', 'code', 'Default'),
        LT.LTCodes.Find('AffiliateLocationRelationTypeOptions', 'code', 'HomeLocation'),
        LT.LTCodes.Get('AffiliateMarketSegmentStatusOptions'),
        LT.LTCodes.Get('AffiliateBankAccountTypeOptions')
    ).then((Rep, Provinces, Countries, AccuracyDefault, RelTypeHomeLoc, AffiliateMarketSegmentStatusOptions, AffiliateBankAccountTypeOptions) => {
        $(function () {

            var Widgets = {};

            // Affiliate
            function PopulateAffiliate() {
                Widgets.BusinessLegalName.val(Rep.affiliate.jobTitle || '');
                Widgets.FirstName.val(Rep.affiliate.firstName || '');
                Widgets.LastName.val(Rep.affiliate.lastName || '');
                Widgets.Phone.val(Rep.affiliate.mobilePhone || '');
                Widgets.Email.val(Rep.affiliate.email || '');
                Widgets.TaxNumber.val(Rep.affiliate.externalCode || '');
            }
            Widgets.BusinessLegalName = $('input[id="rp-business-legal-name"]');
            Widgets.FirstName = $('input[id="rp-first-name"]');
            Widgets.LastName = $('input[id="rp-last-name"]');
            Widgets.Phone = $('input[id="rp-phone"]');
            Widgets.Email = $('input[id="rp-email"]');
            Widgets.TaxNumber = $('input[id="rp-hst-gst-number"]');
            PopulateAffiliate();

            // Location
            function PopulateLocation() {
                Widgets.Address1.val(Rep.homeLocation.address1 || '');
                Rep.homeLocation.latitude && Rep.homeLocation.longitude
                    ? Widgets.Address1.attr('data-lt-latlng', `${Rep.homeLocation.latitude},${Rep.homeLocation.longitude}`)
                    : Widgets.Address1.removeAttr('data-lt-latlng');
                Widgets.Address2.val(Rep.homeLocation.address2 || '');
                Widgets.City.val(Rep.homeLocation.cityName || '');
                Widgets.ProvinceId.val(Rep.homeLocation.provinceId || '');
                Widgets.PostalCode.val(Rep.homeLocation.postalCode || '');
                Widgets.Agreed.prop('checked', Rep.homeLocation.isActive || false); // TODO: Get a more ideal place to read/store this
            }
            Widgets.Address1 = $('input[id="rp-address-1"]').on('change', () => { Widgets.Address1.removeAttr('data-lt-latlng') });
            Widgets.LocAutocomplete = new LT.GoogleAutoComplete.Locate({
                Element: Widgets.Address1[0],
                LocateCallback: function (Loc) {
                    Widgets.Address1.val(Loc.Address1);
                    Loc.Latitude && Loc.Longitude
                        ? Widgets.Address1.attr('data-lt-latlng', `${Loc.Latitude},${Loc.Longitude}`)
                        : Widgets.Address1.removeAttr('data-lt-latlng');
                    Widgets.Address2.val('');
                    Widgets.City.val(Loc.CityName);
                    Widgets.ProvinceId.val((Provinces.find(P => P.code == Loc.ProvinceName) || {}).id || '');
                    Widgets.PostalCode.val(Loc.PostalCode);
                },
            });
            Widgets.Address2 = $('input[id="rp-address-2"]');
            Widgets.City = $('input[id="rp-city"]');
            var CanadaId = Countries.find(C => C.code == 'Canada').id;
            Widgets.ProvinceId = $('select[id="rp-province"]').append(Provinces.reduce((A, P) => A + (P.countryId == CanadaId ? `<option value="${P.id}" data-lt-country-id="${P.countryId}">${P.code}</option>` : ''), ''));
            Widgets.PostalCode = $('input[id="rp-postal"]');
            Widgets.Agreed = $('#rp-have-read-and-accept');
            PopulateLocation();

            // BankAccount
            function PopulateBankAccount() {
                Widgets.Institution.val(Rep.bankAccount.institutionNumber || '');
                Widgets.Transit.val(Rep.bankAccount.transitNumber || '');
                Widgets.Account.val(Rep.bankAccount.accountNumber || '');
            }
            Widgets.Institution = $('input[id="rp-institution-number"]');
            Widgets.Transit = $('input[id="rp-transit-number"]');
            Widgets.Account = $('input[id="rp-account-number"]');
            Widgets.FinancialDetailsModal = $('.rp-financial-details-modal-container').on('click', '.close-modal', () => { Widgets.FinancialDetailsModal.addClass('non-visible') });
            Widgets.FinancialDetailIcon = $('.rp-financial-details-info-icon').on('click', () => { Widgets.FinancialDetailsModal.removeClass('non-visible') });
            PopulateBankAccount();
            
            // Active Profiles
            function PopulateMarketSegments() {
                Widgets.MarketSegmentList.empty();
                Widgets.MarketSegmentList.append(
                    Rep.marketSegments.reduce(
                        (A, S) => A
                            + `<tr data-lt-id="${S.id}">
                                <td data-label="Name">${S.code}</td>
                                <td data-label="Status">${AffiliateMarketSegmentStatusOptions.find(O => O.id == S.status).code}</td>
                            </tr>`,
                        ''
                    )
                );
            }
            Widgets.MarketSegmentList = $('.rp-partner-profiles tbody');
            PopulateMarketSegments();

            // Save
            Widgets.Save =
                $('.rp-update').on('click', function () {
                    var AfflVals = {
                        jobTitle: Widgets.BusinessLegalName.val().trim() || null,
                        firstName: Widgets.FirstName.val().trim() || null,
                        lastName: Widgets.LastName.val().trim() || null,
                        mobilePhone: Widgets.Phone.val().replace(/[^0-9]/g, '') || null,
                        email: Widgets.Email.val().trim() || null,
                        externalCode: Widgets.TaxNumber.val().trim() || null
                    };
                    var HomeLocVals = {
                        address1: Widgets.Address1.val().trim() || null,
                        address2: Widgets.Address2.val().trim() || null,
                        cityName: Widgets.City.val().trim() || null,
                        provinceId: Widgets.ProvinceId.val() || null,
                        countryId: Widgets.ProvinceId.val() ? Widgets.ProvinceId.children(':selected').attr('data-lt-country-id') : null,
                        postalCode: Widgets.PostalCode.val().trim() || null,
                        latitude: Widgets.Address1.attr('data-lt-latlng') ? parseFloat(Widgets.Address1.attr('data-lt-latlng').split(',')[0]) : null,
                        longitude: Widgets.Address1.attr('data-lt-latlng') ? parseFloat(Widgets.Address1.attr('data-lt-latlng').split(',')[1]) : null,
                        isActive: Widgets.Agreed.is(':checked'),
                    };
                    var BankAcctVals = {
                        affiliateId: Rep.affiliate.id,
                        transitNumber: Widgets.Transit.val().trim() || null,
                        institutionNumber: Widgets.Institution.val().trim() || null,
                        accountNumber: Widgets.Account.val().trim() || null,
                        accountType: Widgets.Account.attr('data-lt-account-type') || AffiliateBankAccountTypeOptions.find(T => T.code == 'EFT').id
                    };
                    var IsValid = ValidateFields();
                    if (!IsValid) return false;
                    U.LoadingSplash.Show();
                    $.when(
                        U.AJAX(
                            `/api/Core/Affiliates(${Rep.affiliate.id})`, 'PUT',
                            $.extend({}, Rep.affiliate, AfflVals), null, 'silent', true
                        ).then(R => {
                            $.extend(Rep.affiliate, R.items[0]);
                            PopulateAffiliate();
                        }),
                        (
                            !$.isEmptyObject(Rep.homeLocation)
                                ? U.AJAX(
                                    `/api/FieldService/Locations(${Rep.homeLocation.id})`, 'PUT',
                                    $.extend({}, Rep.homeLocation, HomeLocVals), null, 'silent', true
                                )
                                : U.AJAX(
                                    `/api/FieldService/GetAffiliateFullNameSuggestions?fullName=${Rep.affiliate.fullName}&id=-1`,
                                    'GET', null, null, 'silent'
                                ).then(Names => U.AJAX(
                                    '/api/FieldService/Locations', 'POST',
                                    $.extend(
                                        {},
                                        HomeLocVals,
                                        {
                                            id: -1,
                                            name: Names[0],
                                            accuracy: AccuracyDefault.id,
                                            timeZone: Rep.affiliate.homeTimeZone,
                                            affiliateId: Rep.affiliate.id,
                                            relationType: RelTypeHomeLoc.id
                                        }
                                    ),
                                    null, 'silent', true
                                ))
                        ).then(R => {
                            $.extend(Rep.homeLocation, R.items[0]);
                            PopulateLocation();
                        }),
                        U.AJAX(
                            '/api/FieldService/AddOrUpdateAffiliateBankAccount',
                            'POST', BankAcctVals, null, 'silent', true
                        ).then(() => {
                            $.extend(Rep.bankAccount, BankAcctVals);
                            PopulateBankAccount();
                        })
                    ).then(() => { U.LoadingSplash.Hide() });
                });

            U.ShowUI();

        });
    });

})();