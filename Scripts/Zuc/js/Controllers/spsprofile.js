/*

    spsprofile Controller for the View "spsprofile"
    Copyright 2019, LimeTAC Inc. All rights reserved.

*/

(function () {

    var U = new LTPublicUtils();

    $.when(
        LT.LTCodes.Get('CurrentUserDetails').then(R => U.AJAX('/api/Core/Affiliates?$filter=id eq ' + R.id, 'GET', false, false, 'silent')).then(R => R.items[0]),
        LT.LTCodes.Find('EntityAttachmentTypeOptions', 'code', 'Default')
    ).then((Advisor, AttTypeDefault) => {
        $(function () {

            var Widgets = {};

            Widgets.ProfilePicture = $('.pf-picture-container .pf-picture');
            var PicSrc = (Advisor.attachments.reduce((A, Att) => { if (/ProfilePicture/.test(Att.address)) A.push(Att); return A; }, [{ address: null }])).pop().address;
            if (PicSrc) Widgets.ProfilePicture.attr('src', PicSrc);
            Widgets.PictureUpload =
                $('.pf-picture-container .pf-picture-to-upload').on('change', function () {
                    var File = this.files && this.files[0];
                    if (File && /image.*/.test(File.type)) {
                        canvasResize(File, {
                            width: 360,
                            height: 360,
                            crop: false,
                            quality: 100,
                            rotate: 0,
                            callback: function (Base64Img, NewWidth, NewHeight) { 
                                var Upload = new FormData();
                                Upload.append('File', U.DataURIToBlob(Base64Img), 'ProfilePicture');
                                U.AJAX(
                                    `/api/Core/AddAttachmentFilesToEntity/Affiliate/${Advisor.id}/${AttTypeDefault.id}`, 'POST',
                                    Upload, null, 'normal', false, { contentType: false, processData: false }
                                ).then(R => {
                                    Advisor.attachments.push({
                                        address: R[0].path,
                                        type: AttTypeDefault.id,
                                        entityAttachmentId: R[0].id,
                                        description: null
                                    });
                                    Widgets.ProfilePicture.attr('src', R[0].path);
                                });
                            }
                        });
                    }
                });
            Widgets.Nickname = $('#pf-nickname').val(Advisor.externalCode || '');
            Widgets.NicknameInfo = $('.pf-nickname-info-container');
            Widgets.NicknameIcon =
                $('.pf-nickname-info-icon')
                    .on('mouseover', () => { Widgets.NicknameInfo.removeClass('non-visible') })
                    .on('mouseout', () => { Widgets.NicknameInfo.addClass('non-visible') })
                    .on('click', () => { Widgets.NicknameInfo.toggleClass('non-visible') });
            Widgets.FirstName = $('#pf-first-name').val(Advisor.firstName || '');
            Widgets.LastName = $('#pf-last-name').val(Advisor.lastName || '');
            Widgets.Phone = $('#pf-phone').val(Advisor.mobilePhone || '');
            Widgets.Email = $('#pf-email').val(Advisor.email || '');
            Widgets.SIN = $('#pf-sin').val(Advisor.socialInsuranceNumber || '').on('change', () => { Widgets.SIN.attr('data-lt-changed', 1) });
            Widgets.SINInfo = $('.pf-sin-info-container').val(Advisor.socialInsuranceNumber || '');
            Widgets.SINIcon =
                $('.pf-sin-info-icon')
                    .on('mouseover', () => { Widgets.SINInfo.removeClass('non-visible') })
                    .on('mouseout', () => { Widgets.SINInfo.addClass('non-visible') })
                    .on('click', () => { Widgets.SINInfo.toggleClass('non-visible') });
            Widgets.ReadAndAgree = $('#pf-have-read-and-accept').prop('checked', !!Advisor.hireDate);
            Widgets.Permissions =
                $('.permissions input[data-lt-role-name]').each(function () {
                    var CB = $(this);
                    CB.prop('checked', U.UserHasRole(CB.attr('data-lt-role-name')));
                });
            Widgets.SaveBtn =
                $('.pf-update').on('click', function () {
                    var IsValid = ValidateFields();
                    if (!IsValid) return false;
                    U.AJAX(
                        `/api/Core/Affiliates(${Advisor.id})`, 'PUT',
                        $.extend(
                            {},
                            Advisor,
                            {
                                externalCode: Widgets.Nickname.val().trim() || null,
                                firstName: Widgets.FirstName.val().trim() || null,
                                lastName: Widgets.LastName.val().trim() || null,
                                mobilePhone: Widgets.Phone.val().replace(/[^0-9]/g, '') || null,
                                email: Widgets.Email.val().trim() || null,
                                socialInsuranceNumber: Widgets.SIN.val().trim() || null,
                                updateSocialInsuranceNumber: Widgets.SIN.is('[data-lt-changed]'),
                                hireDate: Widgets.ReadAndAgree.prop('checked') ? new Date().toISOString() : null,
                            }
                        ),
                        null, 'normal', true
                    ).then(R => { $.extend(Advisor, R.items[0]) });
                });

            U.ShowUI();

        });
    });

})();