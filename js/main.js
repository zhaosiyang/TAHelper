$(document).ready(function(){
	setInterval(function(){
		$.get("/AjaxSessionDB", {}, function(data){
			$("#mainPageTable, #mainPageTable_TA").html(data);
			$("#mainPageTable_TA").find("button").text("Manage");
		});
	},5000);
	$("#slider1").slider({
		min: 1,
		max: 24,
		step:1,
		slide: function(event, ui){
			$("#slider1_feedback").text(ui.value);
		}
	})
	$("#saveSession").click(function(){
		var sessionID = $("#inputSessionName").val();
		var duration = $("#slider1_feedback").text();
		var location = $("#inputLocation").val();
		$.post("/AjaxSessionDB", {
			"sessionID": sessionID,
			"duration": duration,
			"location": location
		}, function(data){
			if(data == "Fail"){
				$("#createSessionFail").show();
			}	
			if(data == "Success"){
				$("#createSessionFail").hide();
				$("#closeCreateSession").trigger("click");
				setTimeout(function(){
					$.post("/deleteSession", {sessionID: sessionID});
				}, duration*3600000);
				setTimeout(function(){
					window.location.reload(true);
				}, 1000);
			}
		});
	});
	$("#queueAssistance").click(function fun1(){
		if($("#enterName").val()==""){
			$("#enterNameAlert").show();
		}
		else{
			$("#enterNameAlert").hide();
			$.post("/queue", {
				queueType: "0",
				sessionID: $("#sessionSpan").text(),
				personID: $("#enterName").val()
			}, function(data){
				var myNumber = data.split("|")[0];
				var numberAhead = data.split("|")[1];
				$("#queueAssistance").html("<h4>Your number is "+myNumber+"</h4><h4>In the queue...</h4><h4>" + numberAhead +" people ahead of you</h4><h4>Click to dequeue</h4>");
				$("#queueAssistance").addClass("btn-success");
				$("#queueAssistance").removeClass("btn-info");
				$("#queueAssistance").unbind("click");
				getAheadNumberTimer = setInterval(function(){
					$.get("/queue", {
						command:"getAheadNumber",
						myNumber:myNumber, 
						queueType:"0",
						sessionID: $("#sessionSpan").text()
					}, function(data){
						$("#queueAssistance").html("<h4>Your number is "+myNumber+"</h4><h4>In the queue...</h4><h4>" + data +" people ahead of you</h4><h4>Click to dequeue</h4>");
					});
				},5000);				
				$("#queueAssistance").click(function(){
					$.get('/queue', {
						command: "dequeue",
						myNumber: myNumber,
						queueType: "0",
						sessionID: $("#sessionSpan").text()
					});
					clearInterval(getAheadNumberTimer);
					$("#queueAssistance").addClass("btn-info");
					$("#queueAssistance").removeClass("btn-success");
					$("#queueAssistance").text("Queue for Lab Assistance");
					$("#queueAssistance").unbind("click");
					$("#queueAssistance").click(fun1);
				});
			});			
		}
	});
	$("#queueQuestion").click(function fun1(){
		if($("#enterName").val()==""){
			$("#enterNameAlert").show();
		}
		else{
			$("#enterNameAlert").hide();
			$.post("/queue", {
				queueType: "1",
				sessionID: $("#sessionSpan").text(),
				personID: $("#enterName").val()
			}, function(data){
				var myNumber = data.split("|")[0];
				var numberAhead = data.split("|")[1];
				$("#queueQuestion").html("<h4>Your number is "+myNumber+"</h4><h4>In the queue...</h4><h4>" + numberAhead +" people ahead of you</h4><h4>Click to dequeue</h4>");
				$("#queueQuestion").addClass("btn-success");
				$("#queueQuestion").removeClass("btn-danger");
				$("#queueQuestion").unbind("click");
				getAheadNumberTimer2 = setInterval(function(){
					$.get("/queue", {
						command:"getAheadNumber",
						myNumber:myNumber, 
						queueType:"1",
						sessionID: $("#sessionSpan").text()
					}, function(data){
						$("#queueQuestion").html("<h4>Your number is "+myNumber+"</h4><h4>In the queue...</h4><h4>" + data +" people ahead of you</h4><h4>Click to dequeue</h4>");
					});
				},5000);				
				$("#queueQuestion").click(function(){
					$.get('/queue', {
						command: "dequeue",
						myNumber: myNumber,
						queueType: "1",
						sessionID: $("#sessionSpan").text()
					})
					clearInterval(getAheadNumberTimer2)
					$("#queueQuestion").addClass("btn-danger");
					$("#queueQuestion").removeClass("btn-success");
					$("#queueQuestion").text("Queue for Quick Question");
					$("#queueQuestion").unbind("click");
					$("#queueQuestion").click(fun1);
				});
			});			
		}
	});
	fun_queueRefresh();
	function fun_queueRefresh(){
		$.get("/queue", {
			command: "getQueue",
			queueType: "0",
			sessionID: $("#sessionName").text(),
			myNumber: "0"
		}, function(data){
			$("#queue0container").html(data);
			$("#queue0container").find(":button:first").removeClass("btn-info").addClass("btn-danger").prepend("<span class='glyphicon glyphicon-arrow-right' style='color:white;'></span> ");
			$(".finish0").click(function(){
				clearInterval(queueRefresh);
				$(this).html("Click Again to Remove " + "<br>" + "<span>"+$(this).find("span:last").text()+"</span>");
				queueRefresh = setInterval(fun_queueRefresh, 5000);
				$(this).unbind("click");
				var this_sel = $(this);
				$(this).click(function(){
					this_sel.hide();
					$.get("/queue", {
						command: "dequeue",
						myNumber: $(this).attr("id"),
						queueType: "0",
						sessionID: $("#sessionName").text()
					});
				});
			});
		});
		$.get("/queue", {
			command: "getQueue",
			queueType: "1",
			sessionID: $("#sessionName").text(),
			myNumber: "0"
		}, function(data){	
			$("#queue1container").html(data);
			$("#queue1container").find(":button").removeClass("btn-info").addClass("btn-warning");
			$("#queue1container").find(":button:first").addClass("btn-danger").prepend("<span class='glyphicon glyphicon-arrow-right' style='color:black;'></span> ");
			$(".finish1").click(function(){
				clearInterval(queueRefresh);
				$(this).html("Click Again to Remove " + "<br>" + "<span>"+$(this).find("span:last").text()+"</span>");
				queueRefresh = setInterval(fun_queueRefresh, 5000);
				$(this).unbind("click");
				var this_sel = $(this);
				$(this).click(function(){
					this_sel.hide();
					$.get("/queue", {
						command: "dequeue",
						myNumber: $(this).attr("id"),
						queueType: "1",
						sessionID: $("#sessionName").text()
					});
				});
			});
		});
	}
	queueRefresh = setInterval(fun_queueRefresh,5000);
	function checkExpiredsession(){
		$.get("/deleteSession");
	}
	checkExpiredsession();
	setInterval(checkExpiredsession,60000);
});
