$(document).ready(function () {
    // console.log('dom called');
    let currentPath = window.location.pathname;
    if (currentPath.indexOf('smarterpartner') > 0) {
        playVideo();
    }

    function playVideo() {
            $('.video-modal-container').removeClass('non-visible');
            let mainVideoClass = $('.video-modal');
            let videoTag = $('.modal-video');
            videoTag.empty();
            // let title = $(this).find('p').text();
            // mainVideoClass.find('h2').text(title);
            let videoLink = $(this).find('.video-link').text();
            $('.modal-video').append('<source src="' + videoLink + '" type="video/mp4">');
    }


    $('.video-box').click(playVideo);

    let videoBoxes = document.querySelectorAll('.video-box');
    let currentURL = window.location.href;
    let getNumber = 0;
    let indexOf = currentURL.indexOf('#');
    getNumber = currentURL.slice(indexOf + 1);
    getNumber -= 1;
    console.log(getNumber);
    if(indexOf > 0 && getNumber < 5){
      videoBoxes[getNumber].click(playVideo);
    }else{
        $('.video-modal-container').addClass('non-visible');
    }



    $('.video-modal .close-modal').click(function () {
        // console.log('should close it');
        $('.video-modal-container').addClass('non-visible');
        let vid = document.getElementById('clicked-video');
        vid.load();
        $('.modal-video').empty();
    });

    var thankYouModal = $('.thankYou-modal-container').on('click', '.close-modal', () => { thankYouModal.addClass('non-visible') });
    var becomePartnerModal = $('.becomePartner-form-container');
    var becomePartnerFields = {
        FirstName: $('#sp-bp-first-name'),
        LastName: $('#sp-bp-last-name'),
        Email: $('#sp-bp-email'),
        Phone: $('#sp-bp-phone'),
        Store: $('#sp-bp-store'),
        Location: $('#sp-bp-location'),
        AlreadySelling: $('[name="sp-bp-already-selling-protection-plans"]'),
        Cancel: $('#sp-bp-cancel').on('click', () => { becomePartnerModal.addClass('non-visible') }),
        Save:
            $('#sp-bp-submit').on('click', function () {
                var Data = {
                    alertName: 'Prospective Smarter Partner Contact',
                    tokens: [
                        { name: 'firstName', value: becomePartnerFields.FirstName.val().trim() || null },
                        { name: 'lastName', value: becomePartnerFields.LastName.val().trim() || null },
                        { name: 'email', value: becomePartnerFields.Email.val().trim() || null },
                        { name: 'phone', value: becomePartnerFields.Phone.val().replace(/[^0-9]/g, '') || null },
                        { name: 'store', value: becomePartnerFields.Store.val().trim() || null },
                        { name: 'location', value: becomePartnerFields.Location.val().trim() || null },
                        { name: 'currentlyOfferingProductProtectionPlans', value: becomePartnerFields.AlreadySelling.val() || null },
                    ]
                };
                var InvalidFields = becomePartnerModal.find(':invalid');
                if (InvalidFields.length) {
                    InvalidFields.first().select().css('background-color', '#ffe0e0').one('change', function () { $(this).css('background-color', '') });
                    return false;
                }
                new LTPublicUtils().AJAX('/api/Core/SendMarketPartnerRegistrationEmail', 'POST', Data, false, 'normal', true)
                    .then(R => {
                        becomePartnerModal.addClass('non-visible');
                        thankYouModal.removeClass('non-visible');
                    });
            }),
    };
    $('.becomeSP-formOpen').click(function () {
        becomePartnerModal.removeClass('non-visible');
        becomePartnerFields.FirstName.val('').select();
        becomePartnerFields.LastName.val('');
        becomePartnerFields.Email.val('');
        becomePartnerFields.Phone.val('');
        becomePartnerFields.Store.val('');
        becomePartnerFields.Location.val('');
        becomePartnerFields.AlreadySelling.prop('checked', false);
    });
    $('.becomePartner-form').find('.close-modal').click(function () {
        becomePartnerModal.addClass('non-visible');
    });
}); //main document ends
