﻿/*

    marketpartner Controller for the View "marketpartner"
    Copyright 2019, LimeTAC Inc. All rights reserved.

*/

(function () {

    var U = new LTPublicUtils();

    $.when(
        LT.LTCodes.Get('CanadianProvinceList').then(R => R.sort((A, B) => { var AU = A.code.toUpperCase(), BU = B.code.toUpperCase(); return AU > BU ? 1 : AU < BU ? -1 : 0; })),
        LT.LTCodes.Get('Countries'),
        LT.LTCodes.Get('Currencies'),
        LT.LTCodes.Get('LocationAccuracyOptions'),
        LT.LTCodes.Get('AffiliateLocationRelationTypeOptions'),
        LT.LTCodes.Get('LocationCategories'),
        LT.LTCodes.Get('Languages'),
        LT.LTCodes.Get('TimeZoneLookup').then(R => R.sort((A, B) => { var AU = A.timeZone.toUpperCase(), BU = B.timeZone.toUpperCase(); return AU > BU ? 1 : AU < BU ? -1 : 0; })),
        LT.LTCodes.Get('MarketSegments'),
        LT.LTCodes.Get('PlanProviders'),
        LT.LTCodes.Get('ProductsServices'),
        LT.LTCodes.Get('PreferredCommunicationOptions'),
        LT.LTCodes.Get('ConversationTypes'),
        LT.LTCodes.Get('ContactTypes'),
        LT.LTCodes.Get('AffiliateMarketSegmentStatusOptions'),
        LT.LTCodes.Get('CurrentUserDetails'),
        LT.LTCodes.Get('MarketPartnerEventTypeActivities'),
        LT.LTCodes.Get('AffiliateTypes'),
        LT.LTCodes.Get('BuyingGroups').then(R => R || []),
        U.AJAX("/api/FieldService/EventTypeActivities?$filter=activityDescription eq 'Invite Market Partner'", 'GET', null, null, 'silent').then(R => R.items[0].conversationText),
        U.AJAX('/api/Core/MarketPartner/GetRepresentatives', 'GET', null, null, 'silent').then(R => R || [])
        //LT.LTCodes.Find('PreferredCommunicationOptions', 'code', 'None')
    ).then(
        (
            CanadianProvinceList,
            Countries,
            Currencies,
            LocationAccuracyOptions,
            AffiliateLocationRelationTypeOptions,
            LocationCategories,
            Languages,
            TimeZoneLookup,
            MarketSegments,
            PlanProviders,
            ProductsServices,
            PrefComm,
            ConversationTypes,
            ContactTypes,
            AffiliateMarketSegmentStatusOptions,
            CurrentUserDetails,
            MarketPartnerEventTypeActivities,
            AffiliateTypes,
            BuyingGroupList,
            InviteMarketPartnerDefaultText,
            Reps
        ) => {
            $(function () {

                var Widgets = {};
                var locationId = null;
                var locationName = null;
                var buyingGroupId = null;
                var primaryContactId = null;
                var affiliateMarketSegmentId = null;
                var primaryContactsList = [];

                //Elements
                Widgets.Address1 = $('input[id="mp-details-address-1"]');
                Widgets.Address2 = $('input[id="mp-details-address-2"]');
                Widgets.City = $('input[id="mp-details-city"]');
                Widgets.FullName = $('input[id="mp-details-contact-name"]');
                Widgets.Phone = $('input[id="mp-details-contact-phone"]');
                //Widgets.Email = $('input[id="mp-details-contact-email"]');
                Widgets.PostalCode = $('input[id="mp-details-postal"]');
                Widgets.Province = $('select[id="mp-details-province"]');
                Widgets.StatusFilter = $('#mp-list-filter-status');
                Widgets.RepFilter = $('#mp-list-filter-rep').append(Reps.reduce((A, R) => A + `<option value="${R.id}">${R.fullName}</option>`, ''));
                if (CurrentUserDetails.isHostUser) Widgets.RepFilter.closest('.flex-row').show();
                Widgets.BuyingGroup = $('input[id="mp-details-buying-group"]');
                Widgets.PrimaryContact = $('input[id="mp-details-contact"]');
                Widgets.PrimaryContactEmail = $('input[id="mp-details-contact-email"]');
                Widgets.PrimaryContactPhone = $('input[id="mp-details-contact-phone"]');
                Widgets.MarketSegments = $('select[id="mp-add-market-segment"]');
                Widgets.MarketPartnerLanguages = $('select[id="mp-add-lang-pref"]');
                Widgets.MarketPartnerTimeZones = $('select[id="mp-add-time-zone"]');
                Widgets.MarketPartnerCurrencies = $('select[id="mp-add-currency"]');
                Widgets.PrimaryContactLanguages = $('select[id="mp-details-contact-add-lang-pref"]');
                Widgets.PrimaryContactTimeZones = $('select[id="mp-details-contact-add-time-zone"]');
                Widgets.PrimaryContactCurrencies = $('select[id="mp-details-contact-add-currency"]');
                Widgets.MarketPartnerJobTitle = $('input[id="mp-add-job-title"]');
                Widgets.PrimaryContactFirstName = $('input[id="mp-details-contact-add-first-name"]');
                Widgets.PrimaryContactLastName = $('input[id="mp-details-contact-add-last-name"]');
                Widgets.PrimaryContactAddEmail = $('input[id="mp-details-contact-add-email"]');
                Widgets.PrimaryContactAddPhone = $('input[id="mp-details-contact-add-phone"]');
                Widgets.PlanProviders = $('select[id="mp-details-current-plan-provider"]');
                Widgets.ProductServices = $('select[id="mp-details-products-services"]');
                Widgets.NumberOfLocations = $('input[id="mp-details-loc-count"]');
                Widgets.AnnualSalesVolume = $('input[id="mp-details-annual-sales"]');
                Widgets.AddMarketPartnerModal = $('.mp-add-modal-container');
                Widgets.AddPrimaryContactModal = $('.mp-details-contact-add-modal-container');
                Widgets.AddMarketPartnerModal.addClass('non-visible');
                Widgets.AddPrimaryContactModal.addClass('non-visible');
                Widgets.PartnerList = $('.mp-list tbody');
                Widgets.PartnerDetailBox = $('.partner-data-container');
                Widgets.ConversationBox = $('#mp-conversations');
                Widgets.SaveButton = $('.mp-details-save');
                Widgets.CancelButton = $('.mp-details-cancel');
                Widgets.AddPrimaryButton = $('.mp-details-contact-add');
                Widgets.ConversationList = $('.mp-notes tbody');
                Widgets.CreateConversationModal = $('.mp-add-note-modal-container');
                Widgets.SaveConversationButton = $('.mp-add-note-save');
                Widgets.ActivityNote = $('select[id="mp-add-note-activity"]');
                Widgets.ConversationText = $('#mp-add-note-text');
                Widgets.FollowUpDate = $('input[id="mp-add-note-follow-up-date"]');
                Widgets.InviteButton = $('.mp-details-invite');
                Widgets.ApproveButton = $('.mp-details-approve');
                Widgets.InviteButton.css('visibility', 'hidden');
                Widgets.ApproveButton.css('visibility', 'hidden');
                Widgets.InvitePartnerModal = $('.mp-invite-modal-container');
                Widgets.InviteSentModal = $('.mp-invite-sent-modal-container');
                Widgets.PersonalMessage = $('#mp-invite-message');
                Widgets.PrimaryContactsList = $('#mp-details-contact-options');
                Widgets.BuyingGroupList = $('#mp-details-buying-group-options');
                Widgets.InviteSentMessage = $('.mp-invite-sent-message');
                Widgets.InviteSentToEmail = $('.mp-invite-sent-to');
                //Widgets.InvitationFirstName = $('input[id="mp-invite-first-nam"]');
                //Widgets.InvitationLastName = $('input[id="mp-invite-last-name"]');
                //Widgets.InvitationEmail = $('input[id="mp-invite-email"]');

                //


                //EventHandlers
                BuyingGroupList.forEach(P => {
                    Widgets.BuyingGroupList.append(`<option data-id=${P.id} value="${P.fullName}"></option>`);
                });
                CanadianProvinceList.forEach(P => {
                    Widgets.Province.append(`<option value="${P.id}">${P.code}</option>`);
                });
                Languages.forEach(P => {
                    Widgets.PrimaryContactLanguages.append(`<option value="${P.id}">${P.code}</option>`);
                    Widgets.MarketPartnerLanguages.append(`<option value="${P.id}">${P.code}</option>`);
                });
                TimeZoneLookup.forEach(P => {
                    Widgets.PrimaryContactTimeZones.append(`<option value="${P.timeZone}">${P.timeZone}</option>`);
                    Widgets.MarketPartnerTimeZones.append(`<option value="${P.timeZone}">${P.timeZone}</option>`);
                });
                MarketSegments.forEach(P => {
                    Widgets.MarketSegments.append(`<option value="${P.id}">${P.code}</option>`);
                });
                Currencies.forEach(P => {
                    Widgets.PrimaryContactCurrencies.append(`<option value="${P.id}">${P.code}</option>`);
                    Widgets.MarketPartnerCurrencies.append(`<option value="${P.id}">${P.code}</option>`);
                });
                PlanProviders.forEach(P => {
                    Widgets.PlanProviders.append(`<option value="${P.id}">${P.code}</option>`);
                });
                ProductsServices.forEach(P => {
                    Widgets.ProductServices.append(`<option value="${P.id}">${P.code}</option>`);
                });
                MarketPartnerEventTypeActivities.forEach(P => {
                    Widgets.ActivityNote.append(`<option value="${P.id}">${P.activityDescription}</option>`);
                });

                Widgets.AddPartnerIcon = $('.mp-add').on('click', function () {
                    Widgets.AddMarketPartnerModal.removeClass('non-visible');
                    Widgets.CreateConversationModal.addClass('non-visible');
                    Widgets.AddPrimaryContactModal.addClass('non-visible');
                });
                Widgets.AddConversation = $('.mp-add-note').on('click', function () {
                    Widgets.CreateConversationModal.removeClass('non-visible');
                    var now = new Date();
                    var day = ("0" + now.getDate()).slice(-2);
                    var month = ("0" + (now.getMonth() + 1)).slice(-2);
                    var today = now.getFullYear() + "-" + (month) + "-" + (day);
                    Widgets.FollowUpDate.val(today);
                    Widgets.AddMarketPartnerModal.addClass('non-visible');
                    Widgets.AddPrimaryContactModal.addClass('non-visible');
                });
                AffiliateMarketSegmentStatusOptions.forEach(A => {
                    Widgets.StatusFilter.append(`<option value="${A.id}">${A.name}</option>`);
                });

                Widgets.AddMarketPartnerModal.on('click', '.close-modal', function () {
                    Widgets.AddMarketPartnerModal.addClass('non-visible');
                    ClearFields('MarketPartner');
                });
                Widgets.AddPrimaryContactModal.on('click', '.close-modal', function () {
                    Widgets.AddPrimaryContactModal.addClass('non-visible');
                    ClearFields('PrimaryContact');
                });
                Widgets.CreateConversationModal.on('click', '.close-modal', function () {
                    Widgets.CreateConversationModal.addClass('non-visible');
                    ClearFields('Conversation');
                });
                Widgets.InviteSentModal.on('click', '.close-modal', function () {
                    Widgets.InviteSentModal.addClass('non-visible');
                });
                Widgets.InvitePartnerModal.on('click', '.close-modal', function () {
                    Widgets.InvitePartnerModal.addClass('non-visible');
                    ClearFields('Invite');
                });

                Widgets.BuyingGroup.on('change', function () {
                    let buyer = BuyingGroupList.find(x => x.fullName == Widgets.BuyingGroup.val());
                    if (buyer) {
                        Widgets.BuyingGroup.val(buyer.fullName);
                        buyingGroupId = buyer.id;
                    }
                });

                Widgets.PrimaryContact.on('change', function () {
                    if (primaryContactsList != null) {
                        let primaryContact = primaryContactsList.find(x => x.fullName == Widgets.PrimaryContact.val());
                        if (primaryContact) {
                            Widgets.PrimaryContact.val(primaryContact.fullName);
                            Widgets.PrimaryContactEmail.val(primaryContact.email).attr('data-lt-username', primaryContact.username || '');
                            Widgets.PrimaryContactPhone.val(primaryContact.mobilePhone);
                            primaryContactId = primaryContact.id;
                        }
                    }
                });

                Widgets.StatusFilter.add(Widgets.RepFilter).on('change', function () {
                    ReloadPartnerList();
                });
                Widgets.ActivityNote.on('change', function () {
                    var activity = MarketPartnerEventTypeActivities.find(x => x.id == Widgets.ActivityNote.val());
                    if (activity) {
                        if (activity.conversationText != null) {
                            Widgets.ConversationText.val(activity.conversationText);
                        }
                        if (activity.FollowUpDate != null) {
                            var now = new Date();
                            now.setMinutes(activity.FollowUpDate);
                            var day = ("0" + now.getDate()).slice(-2);
                            var month = ("0" + (now.getMonth() + 1)).slice(-2);
                            var today = now.getFullYear() + "-" + (month) + "-" + (day);
                            Widgets.FollowUpDate.val(today);
                        }
                    }
                });
                Widgets.AddPrimaryButton.on('click', function () {
                    Widgets.AddPrimaryContactModal.removeClass('non-visible');
                    Widgets.AddMarketPartnerModal.addClass('non-visible');
                    Widgets.CreateConversationModal.addClass('non-visible');
                });
                Widgets.SavePrimaryContact = $('.mp-details-contact-add-save').on('click', function () {
                    var IsValid = ValidateFields(Widgets.AddPrimaryContactModal);
                    if (!IsValid) return false;
                    U.LoadingSplash.Show();
                    U.AJAX(
                        '/api/FieldService/GetAffiliateFullNameSuggestions', 'GET',
                        { fullName: `${Widgets.PrimaryContactFirstName.val().trim()} ${Widgets.PrimaryContactLastName.val().trim()}`, id: -1 }, false, 'silent'
                    ).then(R => U.AJAX(
                        '/API/Core/Affiliates', 'POST',
                        {
                            id: -1,
                            firstName: Widgets.PrimaryContactFirstName.val().trim(),
                            lastName: Widgets.PrimaryContactLastName.val().trim(),
                            fullName: R[0],
                            email: Widgets.PrimaryContactAddEmail.val().trim(),
                            mobilePhone: Widgets.PrimaryContactAddPhone.val().replace(/[^0-9]/g, ''),
                            preferredCommunication: PrefComm.find(x => x.code == 'None').id,
                            currencyId: Widgets.PrimaryContactCurrencies.val(),
                            coverageRadius: 0,
                            homeTimeZone: Widgets.PrimaryContactTimeZones.val(),
                            currentTimeZone: Widgets.PrimaryContactTimeZones.val(),
                            preferredLanguageId: Widgets.PrimaryContactLanguages.val(),
                            affiliateTypes: [],
                        },
                        false, 'silent', true
                    )).then(R => U.AJAX(
                        '/API/Core/AffiliateAssociations', 'POST',
                        {
                            id: -1,
                            affiliateId: R.items[0].id,
                            associatedAffiliateId: GetSelectedMPAffiliateData().id,
                            contactTypeId: ContactTypes.find(x => x.code == 'Employee').id
                        },
                        false, 'silent', true
                    )).then(R => {
                        Widgets.AddPrimaryContactModal.addClass('non-visible');
                        return SelectMarketPartner(Widgets.PartnerList.find('tr.Selected')[0]).then(() => {
                            Widgets.PrimaryContact.val(R.items[0].affiliateFullName).trigger('change');
                        });
                    }).then(() => { U.LoadingSplash.Hide() });
                });
                Widgets.InviteButton.on('click', function () {
                    $.when(SaveMarketPartnerDetail()).then(R => {
                        if (R === true) {
                            Widgets.InvitePartnerModal.removeClass('non-visible');
                            Widgets.PersonalMessage.val(InviteMarketPartnerDefaultText);
                        }
                    })
                });
                Widgets.SendInvitation = $('.mp-invite-send').on('click', function () {
                    var IsValid = ValidateFields(Widgets.InvitePartnerModal);
                    if (!IsValid) return false;
                    var HasAccount = !!Widgets.PrimaryContactEmail.attr('data-lt-username');
                    var Email = Widgets.PrimaryContactEmail.val().trim();
                    var PM = Widgets.PersonalMessage.val().trim().replace(/\n/g, '<br />');
                    $.when(
                        !HasAccount
                            ? U.AJAX(`/API/Account/DoesUserNameExist/${encodeURIComponent(Email)}/`, 'GET', false, false, 'silent')
                            : new $.Deferred().resolve(null)
                    ).then(UsernameExists => U.AJAX(
                        '/API/Account/InviteMarketPartner', 'POST',
                        {
                            AffiliateMarketSegmentId: affiliateMarketSegmentId,
                            Personalmessage: PM,
                            UserName:
                                !HasAccount
                                    ? Email + (UsernameExists ? U.GetRandomIntegerInRange(1, 99) : '')
                                    : null,
                        },
                        false, 'normal', true
                    )).then(function (R) {
                        Widgets.InvitePartnerModal.addClass('non-visible');
                        Widgets.InviteSentMessage.html(PM);
                        Widgets.InviteSentToEmail.html(Email);
                        ClearFields('Invite');
                        Widgets.InviteSentModal.removeClass('non-visible');
                        var Today = new Date();
                        Widgets.PartnerList.find('tr.Selected td[data-label="Date Invited"]').text(`${Today.getFullYear()}-${('0' + (Today.getMonth() + 1)).slice(-2)}-${('0' + Today.getDate()).slice(-2)}`);
                        if (!HasAccount) {
                            SelectMarketPartner(Widgets.PartnerList.find('tr.Selected')[0]);
                        }
                    });
                });
                Widgets.ApproveButton.on('click', function () {
                    U.AJAX(
                        '/api/MarketPartner/ApproveMarketPartner/' + affiliateMarketSegmentId, 'POST',
                        false, R => { ReloadPartnerList() } // ReloadPartnerList hides LoadingSplash
                    );
                });

                
                function onRowClick(tableId, callback) {
                    var table = document.getElementsByClassName(tableId)[0],
                        rows = table.getElementsByTagName("tr"),
                        i;
                    for (i = 0; i < rows.length; i++) {
                        table.rows[i].onclick = function (row) {
                            return function () {
                                callback(row);
                            };
                        }(table.rows[i]);
                    }
                };


                //Countries.forEach(P => { Widgets.Location_Country.append(`<option value="${P.id}">${P.code}</option>`); });
                // TODO: Widgets.StatusFilter.append(PartnerStatuses.reduce((A, S) => A + `<option value="${S.id}">${S.code}</option>`, '')); (from Simple Entities with type "PartnerStatuses")

                //Methods
                Widgets.AddPartnerBtn = $('.mp-add-save').on('click', function () {
                    var IsValid = ValidateFields(Widgets.AddMarketPartnerModal);
                    if (!IsValid) return false;
                    U.AJAX(
                        '/API/MarketPartner/CreateMarketPartner', 'POST',
                        {
                            PartnerId: null,
                            PartnerFullName: `<${U.GetRandomString(5)}-${U.GetRandomString(5)}-${U.GetRandomString(5)}-${U.GetRandomString(5)}>`,
                            PartnerJobTitle: Widgets.MarketPartnerJobTitle.val(),
                            MarketSegmentId: Widgets.MarketSegments.val(),
                            Timezone: Widgets.MarketPartnerTimeZones.val(),
                            CurrencyId: Widgets.MarketPartnerCurrencies.val(),
                            LanguageId: Widgets.MarketPartnerLanguages.val()
                        },
                        false, 'normal', true
                    ).then(function (R) {
                        Widgets.AddMarketPartnerModal.addClass('non-visible');
                        ClearFields('MarketPartner');
                        ReloadPartnerList();
                    });
                });

                function ReloadPartnerList() {
                    return U.AJAX(`/API/Core/MarketPartner/GetMarketPartnersAffiliates/${Widgets.StatusFilter.val() || -1}/${Widgets.RepFilter.val()}`).then(function (R) {
                        Widgets.PartnerList.html('');
                        Widgets.InviteButton.css('visibility', 'hidden');
                        Widgets.ApproveButton.css('visibility', 'hidden');
                        if (R.affiliates.length != 0) {
                            R.affiliates.forEach(A => {
                                Widgets.PartnerList.append(
                                    `<tr data-lt-id="${A.id}" data-lt-model="${encodeURIComponent(JSON.stringify(A))}">
                                        <td data-label="Status">${A.status != null ? AffiliateMarketSegmentStatusOptions.find(O => O.id == A.status).code : 'Undefined'}</td>
                                        <td data-label="Name">${A.jobTitle || A.fullName}</td>
                                        <td data-label="Date Invited">${A.invitationDate ? A.invitationDate.substr(0, 10) : ''}</td>
                                    </tr>`
                                );
                            });
                            onRowClick("mp-list", function (row) {
                                Widgets.CancelButton.trigger('click');
                                Widgets.PartnerDetailBox.show();
                                SelectMarketPartner(row);
                            });
                        }
                    });
                }
                function ReloadConversationList(Conversations) {
                    Widgets.ConversationList.html('');
                    Conversations.forEach(C => {
                        Widgets.ConversationList.append(
                            `<tr data-lt-id="${C.id}">
                                <td data-label="Activity">${C.activity != undefined ? C.activity : ''}</td >
                                <td data-label="Created">${C.creationTime.substr(0, 10)}</td>
                                <td data-label="Note">${C.conversationText}</td>
                                <td data-label="Follow-Up">${C.resolutionTime != null ? C.resolutionTime.substr(0, 10) : ''}</td>
                            </tr>`
                        );
                    });
                }

                ReloadPartnerList().done(() => {
                    let PartnerId = U.GetURIParam('partnerId') || null;
                    if (PartnerId) {
                        Widgets.PartnerList.children(`[data-lt-id="${PartnerId}"]`).trigger('click');
                    }
                });

                function GetSelectedMPAffiliateData() {
                    var Data = JSON.parse(
                        decodeURIComponent(
                            Widgets.PartnerList
                                .find('tr.Selected')
                                .attr('data-lt-model')
                        )
                    );
                    return {
                        id: Data.id,
                        fullName: Data.fullName
                    };
                }
                function SelectMarketPartner(selectedRow) {
                    Widgets.PrimaryContactsList.html('');
                    var Prev = Widgets.PartnerList.find('tr.Selected').removeClass('Selected').css('background', '');
                    var PrevData = JSON.parse(decodeURIComponent(Prev.attr('data-lt-model') || '{}'));
                    var Curr = $(selectedRow).addClass('Selected').css('background', 'aqua');
                    var Data = JSON.parse(decodeURIComponent(Curr.attr('data-lt-model')));
                    if (Data.status == AffiliateMarketSegmentStatusOptions.find(O => O.code == 'UnderReview').id && U.UserHasRole('M-Manage User')) {
                        Widgets.ApproveButton.css('visibility', 'visible');
                    } else {
                        Widgets.ApproveButton.css('visibility', 'hidden');
                    }
                    if (['Legacy', 'Prospect', 'InvitedLegacy', 'InvitedProspect'].includes(AffiliateMarketSegmentStatusOptions.find(O => O.id == Data.status).code)) {
                        Widgets.InviteButton.css('visibility', 'visible');
                    } else {
                        Widgets.InviteButton.css('visibility', 'hidden');
                    }
                    Widgets.PrimaryContact.val('');
                    Widgets.PrimaryContactEmail.val('').removeAttr('data-lt-username');
                    Widgets.PrimaryContactPhone.val('');
                    return $.when(
                        FillPrimaryContacts(),
                        (CurrentUserDetails.isHostUser && PrevData.representativeAffiliateId != Data.representativeAffiliateId ? GetRepConversations() : true),
                        U.AJAX(`/API/Core/MarketPartner/GetMarketPartnerDetails/${Data.id}`, 'GET', false, false, 'silent').then(R => R)
                    ).then((ignore1, ignore2, R) => {
                        Widgets.Address1.val(R.address1);
                        Widgets.Address2.val(R.address2);
                        Widgets.City.val(R.cityName);
                        Widgets.Province.val(R.provinceId);
                        Widgets.PostalCode.val(R.postalCode);
                        locationId = R.locationId;
                        locationName = R.locationName;
                        Widgets.NumberOfLocations.val(R.numberLocations);
                        Widgets.AnnualSalesVolume.val(R.annualSalesVolume);
                        Widgets.PlanProviders.val(R.planProviders);
                        Widgets.ProductServices.val(R.productsServices != null ? R.productsServices.map(X => X.simpleEntityCodeId) : null);
                        Widgets.BuyingGroup.val(R.buyingGroupfullName);

                        if (R.primaryContactId) {
                            let primaryContact = primaryContactsList.find(x => x.id == R.primaryContactId);
                            if (primaryContact) {
                                Widgets.PrimaryContact.val(primaryContact.fullName);
                                Widgets.PrimaryContactEmail.val(primaryContact.email).attr('data-lt-username', primaryContact.username || '');
                                Widgets.PrimaryContactPhone.val(primaryContact.mobilePhone);
                                Widgets.PrimaryContact.trigger('change');
                            }
                        }
                        buyingGroupId = R.buyingGroupId;
                        affiliateMarketSegmentId = R.affiliateMarketSegmentId;
                    });
                }


                function FillPrimaryContacts() {
                    return U.AJAX(`/API/Core/MarketPartner/GetMarketPartnerPrimaryContact/${GetSelectedMPAffiliateData().id}`, 'GET', false, false, 'silent').then(function (R) {
                        primaryContactsList = R.primaryContacts;
                        R.primaryContacts.forEach(P => {
                            Widgets.PrimaryContactsList.append(`<option data-id=${P.id} value="${P.fullName}"></option>`);
                        });
                    });
                }
                function ClearFields(ModalName) {
                    if (ModalName == 'MarketPartner') {
                        Widgets.MarketSegments.val('');
                        Widgets.MarketPartnerLanguages.val('');
                        Widgets.MarketPartnerTimeZones.val('');
                        Widgets.MarketPartnerCurrencies.val('');
                        Widgets.MarketPartnerJobTitle.val('');
                    }
                    if (ModalName == 'PrimaryContact') {
                        Widgets.PrimaryContactLanguages.val('');
                        Widgets.PrimaryContactTimeZones.val('');
                        Widgets.PrimaryContactCurrencies.val('');
                        Widgets.PrimaryContactFirstName.val('');
                        Widgets.PrimaryContactLastName.val('');
                        Widgets.PrimaryContactAddEmail.val('');
                        Widgets.PrimaryContactAddPhone.val('');
                    }
                    if (ModalName == 'Conversation') {
                        Widgets.ActivityNote.val('');
                        Widgets.ConversationText.val('');
                        Widgets.FollowUpDate.val('');
                    }
                    if (ModalName == 'Invite') {
                        Widgets.PersonalMessage.val('');
                    }
                }
                function SaveMarketPartnerDetail() {
                    var IsValid = ValidateFields(Widgets.PartnerDetailBox);
                    if (IsValid) {
                        var method = locationId ? 'PUT' : 'POST';
                        var locId = locationId ? locationId : -1;
                        if (locId > -1 || Widgets.Address1.val().trim()) {
                            U.LoadingSplash.Show();
                            return $.when(
                                locId === -1
                                    ? U.AJAX(
                                        '/api/FieldService/GetLocationNameSuggestions', 'GET',
                                        {
                                            name: GetSelectedMPAffiliateData().fullName,
                                            id: locId
                                        },
                                        false, 'silent'
                                    )
                                    : new $.Deferred().resolve([locationName])
                            ).then(R => U.AJAX(
                                `/API/FieldService/Locations${method == 'PUT' ? `(${locId})` : ''}`, method,
                                {
                                    accuracy: LocationAccuracyOptions.find(function (O) { return O.code == 'Default'; }).value,
                                    address1: Widgets.Address1.val().trim(),
                                    address2: Widgets.Address2.val().trim() || null,
                                    affiliateFullName: GetSelectedMPAffiliateData().fullName,
                                    affiliateId: GetSelectedMPAffiliateData().id,
                                    attachments: null,
                                    cityName: Widgets.City.val().trim(),
                                    countryId: Countries.find(x => x.code == 'Canada').id,
                                    email: null,
                                    externalCode: null,
                                    fax: null,
                                    id: locId,
                                    isActive: true,
                                    latitude: null,
                                    locationCategoryId: LocationCategories.find(function (O) { return O.code == 'Area'; }) ? LT.LTCodes.LocationCategories.find(function (O) { return O.code == 'Area'; }).text : undefined,
                                    longitude: null,
                                    name: R[0],
                                    phoneNumber: Widgets.Phone.val().replace(/[^0-9]/g, '') || null,
                                    postalCode: Widgets.PostalCode.val().trim(),
                                    provinceId: Widgets.Province.val(),
                                    regionId: null,
                                    relationType: null,
                                    timeZone: null,
                                    webAddress: null,
                                    xCoordinate: null,
                                    yCoordinate: null,
                                },
                                false, 'normal', true
                            )).then(R => {
                                locationId = R.items[0].id;
                                locationName = R.items[0].name;
                                if (method == 'POST') {
                                    return U.AJAX(
                                        '/API/Core/AffiliateLocations/', 'POST',
                                        {
                                            affiliateId: GetSelectedMPAffiliateData().id,
                                            locationId: locationId,
                                            relationType: 5,
                                        },
                                        false, 'silent', true
                                    );
                                }
                            }).then(() => U.AJAX(
                                '/API/MarketPartner/CreateMarketPartnerAssociations', 'POST',
                                {
                                    AffiliateMarketSegmentId: affiliateMarketSegmentId,
                                    BuyingGroupId: buyingGroupId,
                                    PrimarycontactId: primaryContactId,
                                    NumberOfLocations: parseInt(Widgets.NumberOfLocations.val().trim() || 0, 10) || null,
                                    AnnualSalesVolume: parseInt(Widgets.AnnualSalesVolume.val().trim() || 0, 10) || null,
                                    PlanProviderId: Widgets.PlanProviders.val(),
                                    ProductsServicesList: Widgets.ProductServices.val(),
                                    LocationId: locationId
                                },
                                false, 'silent', true
                            )).then(() => {
                                U.LoadingSplash.Hide();
                                return true;
                            });
                        } else {
                            Widgets.Address1.select();
                        }
                    }
                }
                Widgets.SaveButton.on('click', function () {
                    SaveMarketPartnerDetail();
                    return false;
                });

                Widgets.CancelButton.on('click', function () {
                    Widgets.PartnerList.find('tr.Selected').removeClass('Selected').css('background', '');
                    Widgets.PartnerDetailBox.hide();
                    if (CurrentUserDetails.isHostUser) Widgets.ConversationBox.hide();

                    affiliateMarketSegmentId = null;
                    buyingGroupId = null;
                    primaryContactsList = [];
                    primaryContactId = null;
                    locationId = null;
                    locationName = null;

                    Widgets.ApproveButton.css('visibility', 'hidden');
                    Widgets.InviteButton.css('visibility', 'hidden');
                    Widgets.BuyingGroup.val('');
                    Widgets.PrimaryContact.val('');
                    Widgets.PrimaryContactEmail.val('').removeAttr('data-lt-username');
                    Widgets.PrimaryContactPhone.val('');
                    Widgets.PrimaryContactsList.empty();
                    Widgets.Address1.val('');
                    Widgets.Address2.val('');
                    Widgets.City.val('');
                    Widgets.Province.val('');
                    Widgets.PostalCode.val('');
                    Widgets.NumberOfLocations.val('');
                    Widgets.AnnualSalesVolume.val('');
                    Widgets.PlanProviders.val('');
                    Widgets.ProductServices.val('');

                    $('html').scrollTop(0);
                });

                function GetRepId() {
                    var Data = JSON.parse(decodeURIComponent(Widgets.PartnerList.children('tr.Selected').attr('data-lt-model') || '{}'));
                    return Data.representativeAffiliateId || (!CurrentUserDetails.isHostUser ? CurrentUserDetails.id : null);
                }

                function GetRepConversations() {
                    var RepId = GetRepId();
                    if (RepId) {
                        return U.AJAX(`/API/Core/GetConversations/Affiliate/${RepId}`, 'GET', false, false, 'silent').done(function (R) {
                            ReloadConversationList(
                                R.items.sort(
                                    (A, B) => A.creationTime > B.creationTime ? -1
                                        : A.creationTime < B.creationTime ? 1
                                            : 0
                                )
                            );
                            Widgets.ConversationBox.show();
                        });
                    } else {
                        return $.when(true).done(() => {
                            ReloadConversationList([]);
                            Widgets.ConversationBox.hide();
                        });
                    }
                }
                GetRepConversations();

                Widgets.SaveConversationButton.on('click', function () {
                    var RepId = GetRepId();
                    var IsValid = ValidateFields(Widgets.CreateConversationModal);
                    if (!IsValid || !RepId) return false;
                    U.AJAX(
                        `/API/Core/CreateConversation/Affiliate/${RepId}/${ConversationTypes.find(T => T.code == 'Customer').id}/${Widgets.ActivityNote.val() || -1}`,
                        'POST', { text: Widgets.ConversationText.val().trim() }
                    ).then(function (Result) {
                        if (typeof Result == 'number' && Widgets.FollowUpDate.val()) {
                            return U.AJAX(`/API/Core/ModifyResolutionForConveration/${Result}/${Widgets.FollowUpDate.val()}-0-0-0`, 'GET', false, false, 'silent');
                        }
                    }).then(function () {
                        GetRepConversations();
                        Widgets.CreateConversationModal.addClass('non-visible');
                        ClearFields('Conversation');
                    });
                    return false;
                });
                new LT.GoogleAutoComplete.Locate({
                    Element: Widgets.Address1[0],
                    LocateCallback: function (Loc) {
                        Widgets.Address1.val(Loc.Address1);
                        Widgets.City.val(Loc.CityName);
                        Widgets.PostalCode.val(Loc.PostalCode);
                        var province = CanadianProvinceList.find(x => x.code == Loc.ProvinceName);
                        var country = Countries.find(x => x.code == Loc.CountryName);
                        if (province) {
                            Widgets.Province.val(province.id);
                        }
                        //if (country) {
                        //    //Widgets.count.val(country.id);
                        //}
                        //Widgets.Province = $('input[name="mp-details-province"]');
                    },
                });
                //

                // TODO: Get data, sort alphabetically, and populate as <tr>s

                U.ShowUI();

            });
        }
    );

})();