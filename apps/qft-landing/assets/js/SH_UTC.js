
		// Set the date we're counting down to
		var countDownDate = new Date("Mar 4, 2020 23:00:00" ).getTime();
	
		// Update the count down every 1 second
		var countdownfunction = setInterval(function () {
	
			// Get todays date and time
			var now = new Date().getTime();
	
			// Find the distance between now an the count down date
			var distance = now - countDownDate;
	
			// Time calculations for days, hours, minutes and seconds
			var days = Math.floor(distance / (1000 * 60 * 60 * 24));
			var hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
			var minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
			var seconds = Math.floor((distance % (1000 * 60)) / 1000);
	
			// Output the result in an element with id="demo"
			document.getElementById("SH_Uptime").innerHTML = days + "d " + hours + "h " + minutes + "m " + seconds + "s ";
	
			// If the count down is over, write some text 
			if (distance < 0) {
				clearInterval(countdownfunction);
				document.getElementById("SH_Uptime").innerHTML = "EXPIRED";
			}
		}, 1000);

		// Set the date we're counting down to
		var ADTcountDownDate = new Date("Mar 1, 2020 12:00:00" ).getTime();
	
		// Update the count down every 1 second
		var ADTcountdownfunction = setInterval(function () {
	
			// Get todays date and time
			var now = new Date().getTime();
	
			// Find the distance between now an the count down date
			var ADTdistance = now - ADTcountDownDate;
	
			// Time calculations for days, hours, minutes and seconds
			var ADTdays = Math.floor(ADTdistance / (1000 * 60 * 60 * 24));
			var ADThours = Math.floor((ADTdistance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
			var ADTminutes = Math.floor((ADTdistance % (1000 * 60 * 60)) / (1000 * 60));
			var ADTseconds = Math.floor((ADTdistance % (1000 * 60)) / 1000);
	
			// Output the result in an element with id="demo"
			document.getElementById("App_Downtime").innerHTML = ADTdays + "d " + ADThours + "h " +ADTminutes + "m " + ADTseconds + "s ";
	
			// If the count down is over, write some text 
			if (ADTdistance < 0) {
				clearInterval(ADTcountdownfunction);
				ADTdocument.getElementById("App_Downtime").innerHTML = "EXPIRED";
			}
		}, 1000);

		// Set the date we're counting down to
		var DSUTcountDownDate = new Date("Oct 6, 2020 12:00:00" ).getTime();
	
		// Update the count down every 1 second
		var ADTcountdownfunction = setInterval(function () {
	
			// Get todays date and time
			var now = new Date().getTime();
	
			// Find the distance between now an the count down date
			var DSUTdistance = now - DSUTcountDownDate;
	
			// Time calculations for days, hours, minutes and seconds
			var DSUTdays = Math.floor(DSUTdistance / (1000 * 60 * 60 * 24));
			var DSUThours = Math.floor((DSUTdistance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
			var DSUTminutes = Math.floor((DSUTdistance % (1000 * 60 * 60)) / (1000 * 60));
			var DSUTseconds = Math.floor((DSUTdistance % (1000 * 60)) / 1000);
	
			// Output the result in an element with id="demo"
			document.getElementById("DS_Uptime").innerHTML = DSUTdays + "d " + DSUThours + "h " +DSUTminutes + "m " + DSUTseconds + "s ";
	
			// If the count down is over, write some text 
			if (DSUTdistance < 0) {
				clearInterval(DSUTcountdownfunction);
				DSUTdocument.getElementById("DS_Uptime").innerHTML = "EXPIRED";
			}
		}, 1000);