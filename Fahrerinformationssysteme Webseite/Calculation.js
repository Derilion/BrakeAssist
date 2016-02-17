/*
	author: Maximilian Bier
	date: 02.02.2016
	version: 1.0
*/

const a_haptic_ms = 3; 				//haptic warning velocity
const a_eb_ms = 5.5; 				//emergency braking velocity
const t_consthaptic_s = 1;			//haptic warning time
const t_warning_s = 1;				//visual warning time
const s_puffer_m = 1;				//puffer distance
var diagram1;						//global reference for diagram 1
var diagram2;						//global reference for diagram 2
var init = true;
var last_index_s = 0;
var last_index_t = 0;
var solution = 20;					//sets the number of values displayed *change this to get more example values*

function calculate() {
				/*
				function: 	calculate
				variables:	none
				returns:	brake assist status
				task:		if variables are changed, the breaking timeline is 
							calculated and all possible cases are considered.
							Those are:
							1. No braking is needed
							2. braking according to the pattern
							3. braking but not as long as the specified pattern (vehicle is too slow for the second brake)
							4. safety puffer cannot be maintained
							5. a braking attempt resulting in a crash
				*/
				
                var v_own = parseFloat(document.getElementById('v_own').value);
                var v_ahead = parseFloat(document.getElementById('v_ahead').value);
				var a_ahead = parseFloat(document.getElementById('a_ahead').value);
                var s_range_m = parseFloat(document.getElementById('range').value);
				var selector = parseFloat(document.getElementById('selector').value);
				var s_braking = 0;
				var s_brakingaux = 0;
				var t_braking_s = 0;
				var t_brakingaux = 0;
				var t_haptic_s = 0;
				var t_nothing_s = 0;
				var t_crash_s = [0, 0];
				var tmp_resultArray = [0, 0];
				
				//check whether input figures are valid
				
				if(v_own < 0 || v_ahead < 0 || s_range_m < 0 || isNaN(v_own) || isNaN(v_ahead) || isNaN(a_ahead) || isNaN(s_range_m)){
					document.getElementById('answer').innerHTML =  'Please insert valid numbers only';
				}
				else{
				
					//dynamic unit selection
					selection(selector);
					
					//adapting to the m/s or km/h selector
					v_own = v_own / selector;
					v_ahead = v_ahead / selector;
					
					//check if there would be a crash
					t_crash_s = calcBrakeNecc(v_own, v_ahead, a_ahead, s_range_m);
					
					if(t_crash_s[0] == -1){
						hideGraphics();
						document.getElementById('answer').innerHTML = 'Break assistance not required';
					}
					
					else{
						//check if vehicle ahead is braking and handle the case
						if(a_ahead<0){
							t_brakingaux = 	v_ahead/-a_ahead;
							s_brakingaux = s_range_m + v_ahead*t_brakingaux + 0.5*a_ahead*t_brakingaux*t_brakingaux;
							if(t_brakingaux<t_crash_s[0]){
								//recalculate t_crash_s with a car ahead that has stopped
								t_crash_s = calcBrakeNecc(v_own, 0, 0, s_brakingaux);
							}
						}
						
						//calculating the braking time
						tmp_resultArray = calculate_t_braking(v_own);
						t_braking_s = tmp_resultArray[0];
						t_haptic_s = tmp_resultArray[1];
						
						//calculate the remaining waiting time
						s_braking=calc_s_braking(t_braking_s, t_haptic_s, v_own);
						t_nothing_s = calc_t_nothing(t_crash_s, s_braking, v_own);

						//do the graphics and check for a crash
						if (doGraphicsNormal(t_nothing_s, t_haptic_s, t_braking_s, s_range_m, v_own, v_ahead, a_ahead, t_brakingaux, s_brakingaux)) {
							document.getElementById('answer').innerHTML = 'Brake Assistance active';
						}
						else{
							document.getElementById('answer').innerHTML = 'Brake assistance can\'t avoid crash';
						}
					}
				}
            }
			
function calc_s_braking(t_braking_s, t_haptic_s, v_own){
/*
	description:	calculates the braking distance
*/
	var t_ges_s = t_braking_s + t_haptic_s;
	var s_braking_m = (v_own*(t_haptic_s+ t_warning_s)- 0.5 * a_haptic_ms * t_haptic_s * t_haptic_s) + (v_own - a_haptic_ms * t_haptic_s)*t_braking_s - 0.5 * a_eb_ms * t_braking_s * t_braking_s;
	return s_braking_m;
}

function calc_t_nothing(t_crash_s, s_braking, v_own){
/*
	description:	calculates the time until the braking sequence is triggered.
*/

	//calculate the trigger moment for the braking sequence
	var t_nothing_s = s_braking/ v_own;

	//check if the safety puffer can be maintained
	if(t_crash_s[1]>=t_nothing_s){
		t_nothing_s = t_crash_s[1]-t_nothing_s;
	}
	else if(t_crash_s[0]>=t_nothing_s){
		t_nothing_s = t_crash_s[0]-t_nothing_s;
	}
	else{
		t_nothing_s = 0;
	}
	return t_nothing_s;
}

function calcBrakeNecc(v_own, v_ahead, a_ahead, s_range_m){
/*
	description:	returns if the cars would crash and when
*/
	var t_crash_array;
	var t_crash_abs;
	var t_crash_puffer;
	
	if(a_ahead == 0){
	//formula without acceleration of the car ahead
		t_crash_abs = -s_range_m/(v_ahead - v_own);
		t_crash_puffer = -(s_range_m-s_puffer_m)/(v_ahead - v_own);
	}
	else{
		//formula with acceleration of the car ahead
		t_crash_abs = -(v_ahead - v_own + Math.sqrt((v_ahead*v_ahead - 2*v_ahead*v_own + v_own*v_own - 2*a_ahead*s_range_m)))/a_ahead;
		t_crash_puffer = -(v_ahead - v_own + Math.sqrt((v_ahead*v_ahead - 2*v_ahead*v_own + v_own*v_own - 2*a_ahead*(s_range_m - s_puffer_m))))/a_ahead;
	}
	if(isNaN(t_crash_abs)||(t_crash_abs<0)){
		//return value for no crash at all
		return [-1, -1]
	}
	else{
		//return values for the moment of crash and the moment of violation of the safety puffer
		t_crash_array = [t_crash_abs, t_crash_puffer]
		return t_crash_array;
	}
}
					
function calculate_t_braking(v_own){
/*
	description:	returns if the cars would crash and when
*/
	
	var t_braking_s = 0;
	var t_haptic_s = 0;
				
	//formula for breaking time until velocity = 0m/s
				
	t_braking_s = -(a_haptic_ms - v_own)/a_eb_ms //(a_haptic_ms * t_consthaptic_s - v_own)/(-a_eb_ms);
				
	//in case no emergency breaking is needed (speed already reduced to 0m/s)
				
	if(t_braking_s<0){	
		t_braking_s = 0;
		t_haptic_s = v_own/a_haptic_ms;
	}
	else{
		t_haptic_s = t_consthaptic_s;
	}
				
	return [t_braking_s, t_haptic_s];				
}

function getSpeed(v_own, t_now_s, t_nothing_s, t_haptic_s, t_braking_s){
/*
	description:	is able to calculate the speed of the braking car at any moment *t_now* given
*/

	var v_ms;
	
	//decide where in the braking sequence the specific moment is
	if(t_now_s < t_nothing_s + t_warning_s){
			v_ms = v_own;
		}
		else if(t_now_s < t_nothing_s + t_warning_s+ t_haptic_s){
			v_ms = v_own - a_haptic_ms*(t_now_s - (t_nothing_s + t_warning_s));
		}
		else if(t_now_s < (t_nothing_s + t_warning_s + t_haptic_s + t_braking_s) ){
			v_ms = v_own - a_haptic_ms*(t_haptic_s) - a_eb_ms*(t_now_s - (t_nothing_s + t_warning_s + t_haptic_s));
		}
		else {
			v_ms = v_own - a_haptic_ms*(t_haptic_s) - a_eb_ms*t_braking_s;
		}
	
return v_ms;
}

function getDist(s_range_m, v_own, v_ahead, a_ahead, t_now_s, t_nothing_s, t_haptic_s, t_braking_s, t_brakingaux, s_brakingaux){
/*
	description:	is able to calculate the distance of the braking car and the car ahead at any moment *t_now* given
*/
	
	var distance_s;
	if(t_now_s<=t_brakingaux || t_brakingaux == 0){
			distance_s = 0.5*a_ahead*t_now_s*t_now_s + v_ahead*t_now_s + s_range_m;
		}
		else{
			distance_s = s_brakingaux;
		}
		if(t_now_s < t_nothing_s + t_warning_s){
			distance_s = distance_s-v_own*t_now_s;
		}
		else if(t_now_s < t_nothing_s + t_warning_s + t_haptic_s){
			distance_s = distance_s-v_own*t_now_s - 0.5*a_haptic_ms*(t_now_s - (t_nothing_s+t_warning_s))*(t_now_s - (t_nothing_s+t_warning_s));
		}
		else if(t_now_s < t_nothing_s + t_warning_s + t_haptic_s + t_braking_s){
			distance_s = distance_s-(v_own*(t_nothing_s+t_warning_s+t_haptic_s) - 0.5 * a_haptic_ms*(t_haptic_s)*(t_haptic_s)+(v_own - a_haptic_ms * t_haptic_s)*(t_now_s - (t_nothing_s + t_warning_s + t_haptic_s)) - 0.5 * a_eb_ms*(t_now_s - (t_nothing_s + t_warning_s + t_haptic_s))*(t_now_s - (t_nothing_s + t_warning_s + t_haptic_s)));
		}
		else {
			distance_s = distance_s-((v_own*(t_nothing_s+t_warning_s+t_haptic_s) - 0.5 * a_haptic_ms*(t_haptic_s)*(t_haptic_s))+(v_own - a_haptic_ms * t_haptic_s)*(t_braking_s) - 0.5 * a_eb_ms*(t_braking_s)*(t_braking_s));
		}
	
	return distance_s;
}

function initGraphics(){
/*
	description:	starts the diagrams with dummy values on the first start of a visualisation
*/

	var Data = {
	labels : [1,2],
	datasets : [
        {
            label: "My First dataset",
            fillColor: "rgba(83,83,205,0.2)",
            strokeColor: "rgba(83,83,205,1)",
            pointColor: "rgba(83,83,205,1)",
            pointStrokeColor: "#fff",
            pointHighlightFill: "#fff",
            pointHighlightStroke: "rgba(83,83,205,1)",
			legendTemplate : "<ul class=\"<%=name.toLowerCase()%>-legend\"><% for (var i=0; i<datasets.length; i++){%><li><span style=\"background-color:<%=datasets[i].strokeColor%>\"></span><%if(datasets[i].label){%><%=datasets[i].label%><%}%></li><%}%></ul>",
            data: [65, 59]
        },
        {
            label: "My Second dataset",
            fillColor: "rgba(151,87,205,0.2)",
            strokeColor: "rgba(151,87,205,1)",
            pointColor: "rgba(151,87,205,1)",
            pointStrokeColor: "#fff",
            pointHighlightFill: "#fff",
            pointHighlightStroke: "rgba(151,87,205,1)",
            data: [1, 2]
        }
    ]
}
	var Data2 = {
	labels : [1,2],
	datasets : [
        {
            label: "My First dataset",
            fillColor: "rgba(83,83,205,0.2)",
            strokeColor: "rgba(83,83,205,1)",
            pointColor: "rgba(83,83,205,1)",
            pointStrokeColor: "#fff",
            pointHighlightFill: "#fff",
            pointHighlightStroke: "rgba(83,83,205,1)",
			//legendTemplate : "<ul class=\"<%=name.toLowerCase()%>-legend\"><% for (var i=0; i<datasets.length; i++){%><li><span style=\"background-color:<%=datasets[i].strokeColor%>\"></span><%if(datasets[i].label){%><%=datasets[i].label%><%}%></li><%}%></ul>",
            data: [65, 59]
        }
    ]
}

	last_index_s = 2;
	last_index_t = 2;
	var canvas1 = document.getElementById('st_diag').getContext('2d');
	var canvas2 = document.getElementById('vt_diag').getContext('2d');
	diagram1 = new Chart(canvas1).Line(Data, {animation: false});
	diagram2 = new Chart(canvas2).Line(Data2, {animation: false, bezierCurve: false});
}

function doGraphicsNormal(t_nothing_s, t_haptic_s, t_braking_s, s_range_m, v_own, v_ahead, a_ahead, t_brakingaux, s_brakingaux){
	
/*
	description:	handles returning values to the html document and generating current diagram values
*/
	//calculate data
	var t_ges = t_nothing_s + t_warning_s + t_haptic_s + t_braking_s;
	var t_steps = Math.round((t_ges + t_ges/10 + 0.5)*10)/10;
	var dist_ahead, dist_own, temp_speed_ms, temp_dist_m, crashTime_s;
	var checkvar = true;
	
	//display relevant parts of the html document
	var divTable = document.getElementById("represantationTable");
	divTable.style.display = "block";
	var divDiag = document.getElementById("representer1");
	divDiag.style.display = "block";
	
	//writing values to the result table with 0.01 precision
	temp_speed_ms = getSpeed(v_own, t_nothing_s, t_nothing_s, t_haptic_s, t_braking_s);
	temp_dist_m = getDist(s_range_m, v_own, v_ahead, a_ahead, t_nothing_s, t_nothing_s, t_haptic_s, t_braking_s, t_brakingaux, s_brakingaux)
	document.getElementById('warning_time').innerHTML = Math.round(t_nothing_s*100)/100+" s";
	document.getElementById('warning_dist').innerHTML = Math.round(temp_dist_m*100)/100+" m";
	document.getElementById('warning_speed').innerHTML = Math.round(temp_speed_ms*100)/100+" m/s";
	
	temp_speed_ms = getSpeed(v_own, (t_nothing_s + t_warning_s), t_nothing_s, t_haptic_s, t_braking_s);
	temp_dist_m = getDist(s_range_m, v_own, v_ahead, a_ahead, (t_nothing_s + t_warning_s), t_nothing_s, t_haptic_s, t_braking_s, t_brakingaux, s_brakingaux)
	document.getElementById('haptic_time').innerHTML = Math.round((t_nothing_s + t_warning_s)*100)/100+" s";
	document.getElementById('haptic_dist').innerHTML = Math.round(temp_dist_m*100)/100+" m";
	document.getElementById('haptic_speed').innerHTML = Math.round(temp_speed_ms*100)/100+" m/s";
	
	if(t_braking_s != 0){
		temp_speed_ms = getSpeed(v_own, (t_nothing_s + +t_warning_s + t_haptic_s), t_nothing_s, t_haptic_s, t_braking_s);
		temp_dist_m = getDist(s_range_m, v_own, v_ahead, a_ahead, (t_nothing_s + +t_warning_s + t_haptic_s), t_nothing_s, t_haptic_s, t_braking_s, t_brakingaux, s_brakingaux)
		document.getElementById('emergency_time').innerHTML = Math.round((t_nothing_s + +t_warning_s + t_haptic_s)*100)/100+" s";
		document.getElementById('emergency_dist').innerHTML = Math.round(temp_dist_m*100)/100+" m";
		document.getElementById('emergency_speed').innerHTML = Math.round(temp_speed_ms*100)/100+" m/s";
	}
	else{
		temp_dist_m = getDist(s_range_m, v_own, v_ahead, a_ahead, (t_nothing_s + +t_warning_s + t_haptic_s), t_nothing_s, t_haptic_s, t_braking_s, t_brakingaux, s_brakingaux)
		document.getElementById('emergency_time').innerHTML = 'Vehicle already stands still after '+ Math.round((t_nothing_s + +t_warning_s + t_haptic_s)*100)/100 +' s';
		document.getElementById('emergency_dist').innerHTML = Math.round(temp_dist_m*100)/100+" m";
		document.getElementById('emergency_speed').innerHTML = "0 m/s";
	}
	
	//initialise graphics if neccesary
	if(init){
				init = false;
				initGraphics();
			}
	
	//delete old values
	while(last_index_t > 0){
		diagram1.removeData();
		last_index_t --;
	}
	while(last_index_s > 0){
		diagram2.removeData();
		last_index_s --;
	}
	
	//add new values to graphs
	for (var i = 0; i <= t_steps; i+=(t_steps/solution)){
		if(i<=t_brakingaux || t_brakingaux == 0){
			dist_ahead = 0.5*a_ahead*i*i + v_ahead*i + s_range_m;
		}
		else{
			dist_ahead = s_brakingaux;
		}
		if(i < t_nothing_s + t_warning_s){
			dist_own = v_own*i;
		}
		else if(i < t_nothing_s + t_warning_s + t_haptic_s){
			dist_own = v_own*i - 0.5*a_haptic_ms*(i - (t_nothing_s+t_warning_s))*(i - (t_nothing_s+t_warning_s));
		}
		else if(i < t_ges){
			dist_own = v_own*(t_nothing_s+t_warning_s+t_haptic_s) - 0.5 * a_haptic_ms*(t_haptic_s)*(t_haptic_s)+(v_own - a_haptic_ms * t_haptic_s)*(i - (t_nothing_s + t_warning_s + t_haptic_s)) - 0.5 * a_eb_ms*(i - (t_nothing_s + t_warning_s + t_haptic_s))*(i - (t_nothing_s + t_warning_s + t_haptic_s));
		}
		else {
			dist_own = (v_own*(t_nothing_s+t_warning_s+t_haptic_s) - 0.5 * a_haptic_ms*(t_haptic_s)*(t_haptic_s))+(v_own - a_haptic_ms * t_haptic_s)*(t_braking_s) - 0.5 * a_eb_ms*(t_braking_s)*(t_braking_s);
		}
		diagram1.addData([Math.round(dist_ahead*100)/100, Math.round(dist_own*100)/100], Math.round(i*100)/100);
		if(dist_ahead<= dist_own && checkvar){
			var localspeed = Math.abs(getSpeed(v_own, i, t_nothing_s, t_haptic_s, t_braking_s)-(v_ahead+a_ahead*i))
			var localdist = Math.round((dist_own-dist_ahead)*10000)/10000;
			crashTime_s = i - localdist/localspeed;
			if(isNaN(crashTime_s)){
				crashTime_s = i;
			}
			checkvar = false;
		}
		last_index_t += 1;
	}
	
	diagram1.update;
	for (var j = 0; j <= t_steps; j+=(t_steps/solution)){
		
		if(j < t_nothing_s + t_warning_s){
			dist_own = v_own;
		}
		else if(j < t_nothing_s + t_warning_s+ t_haptic_s){
			dist_own = v_own - a_haptic_ms*(j - (t_nothing_s + t_warning_s));
		}
		else if(j < t_ges){
			dist_own = v_own - a_haptic_ms*(t_haptic_s) - a_eb_ms*(j - (t_nothing_s + t_warning_s + t_haptic_s));
		}
		else {
			dist_own = v_own - a_haptic_ms*(t_haptic_s) - a_eb_ms*t_braking_s;
		}
		diagram2.addData([Math.round(dist_own*100)/100], Math.round(j*100)/100);
		last_index_s += 1;
	}
	
	//display settings for result table
	if(checkvar){
		var divCollision = document.getElementById("collision");
		divCollision.style.display = "none";
		var divCollision = document.getElementById("stop");
		divCollision.style.display = "table-row";
		temp_dist_m = getDist(s_range_m, v_own, v_ahead, a_ahead, (t_nothing_s + +t_warning_s + t_haptic_s + t_braking_s), t_nothing_s, t_haptic_s, t_braking_s, t_brakingaux, s_brakingaux)
		document.getElementById('stop_time').innerHTML =  Math.round((t_nothing_s + +t_warning_s + t_haptic_s + t_braking_s)*100)/100+" s";
		document.getElementById('stop_dist').innerHTML = Math.round(temp_dist_m*100)/100+" m";
		document.getElementById('stop_speed').innerHTML = "0 m/s";
	}
	else{
		var divCollision = document.getElementById("collision");
		divCollision.style.display = "table-row";
		var divCollision = document.getElementById("stop");
		divCollision.style.display = "none";
		document.getElementById('collision_time').innerHTML = Math.round((crashTime_s)*100)/100+" s";
		document.getElementById('collision_speed').innerHTML = Math.round((getSpeed(v_own, crashTime_s, t_nothing_s, t_haptic_s, t_braking_s))*100)/100+" m/s";
	}
	
	return checkvar;
}

function hideGraphics(){
/*
	description:	hides all unnecessary html elements
*/

	var divCollision = document.getElementById("collision");
	divCollision.style.display = "none";
	var divStop = document.getElementById("stop");
	divStop.style.display = "none";
	var divTable = document.getElementById("represantationTable");
	divTable.style.display = "none";
	var divDiag = document.getElementById("representer1");
	divDiag.style.display = "none";
}

function selection(selector) {
/*
	description:	changes the displayed unit according to the html selector
*/
				switch(selector){
					case 1:
							document.getElementById('msm_unit_1').innerHTML = "m/s";
							document.getElementById('msm_unit_2').innerHTML = "m/s";
							break;
					case 3.6:
							document.getElementById('msm_unit_1').innerHTML = "km/h";
							document.getElementById('msm_unit_2').innerHTML = "km/h";
							break;
					default:
							document.getElementById('msm_unit_1').innerHTML = "ERROR";
							document.getElementById('msm_unit_2').innerHTML = "ERROR";
							break;
					
				}
			}
