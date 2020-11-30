(function(){
	// Purecare page ecommerce
	$('.shopPureCare').click(function(){
		
		//event.preventDefault();
		//gtag code
		gtag('event','page_view',{
			page_location: 'https://zucorahome.com/Zuc/ecomcategory?c=PureCare',
			page_path:'/Zuc/ecomcategory?c=PureCare'
		});
		
	});

	$('.buyPillow').click(function(){
		gtag('event','generate_lead',{
			currency:'CAD',
			value:'$172.99 to $182.99'
		});
		gtag('event','page_view'.{
			page_location:'https://zucorahome.com/Zuc/ecomdetails?i=SUB-0%20Soft%20Cell%20Chill%20Latex%20Pillow',
			page_path:'/Zuc/ecomdetails?i=SUB-0%20Soft%20Cell%20Chill%20Latex%20Pillow'
		});
	});
	//whenever shop all button clicked

	$('.shopAll').click(function(){
		gtag('event','page_view',{
			page_location:'https://zucorahome.com/Zuc/ecomhome',
			page_path:'/Zuc/ecomhome'
		});
	});

})();