$(document).ready(function(){
	// console.log('DOM called');

	$('.employeesFeedback-slider-gallery').slick({
		infinite:true,
		speed:300,
		slidesToShow:2,
		slidesToScroll:1,
		nextArrow: $('.employeesFeedback-slider .right-slide'),
        prevArrow: $('.employeesFeedback-slider .left-slide'),
		responsive:[
			{
				breakpoint:1024,
				settings:{
					slidesToShow:1,
					slidesToScroll:1,
					infinite:true
				}
			},
			{
				breakpoint:350,
				settings:{
					slidesToShow:1,
					slidesToScroll:1,
					infinite:true
				}
			},
			{
				breakpoint:768,
				settings:{
					slidesToShow:1,
					slidesToScroll:1,
					infinite:true
				}
			}
		]
	});
	    $('body').on('click', "a[href^='#']", function (e) {
        e.preventDefault();
        var href = $(this).attr("href").trim();
        if (href != '#') {
            var position = $(href).offset().top;
            position -= 200;
            $("body, html").animate({
                scrollTop: position
            }, 1000);
        }
    });
});