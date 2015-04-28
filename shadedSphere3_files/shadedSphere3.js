var canvas;
var gl;
var program;

var index = 0;

var pointsArray = [];
var normalsArray = [];

var va = vec4(0.0, 0.0, -1.0,1);					//initialize variables for the shpere generator
var vb = vec4(0.0, 0.942809, 0.333333, 1);
var vc = vec4(-0.816497, -0.471405, 0.333333, 1);
var vd = vec4(0.816497, -0.471405, 0.333333,1);
    
var lightPosition = vec4(1.0, 0.0, 0.0, 1.0 );		//initialize light's properties
var lightAmbient = vec4(0.1, 0.1, 0.1, 1.0 );
var lightDiffuse = vec4( 0.7, 0.7, 1.0, 1.0 );
var lightSpecular = vec4( 1.0, .8, .9, 1.0 );

var materialAmbient = vec4( 0.1, 0.1, 1.0, 1.0 );	//initialize default material properties
var materialDiffuse = vec4( 0.1, 0.1, 1.0, 1.0 );
var materialSpecular = vec4( 1.0, 1.0, 1.0, 1.0 );
var materialShininess = 30.0;

var ctm;											//initialize shader variables
var ambientColor, diffuseColor, specularColor;
var ambientProduct, diffuseProduct, specularProduct, shininess;

var vertexShadingType, fragmentShadingType;
var modelViewMatrix, projectionMatrix;
var modelViewMatrixLoc, projectionMatrixLoc, vertexShadingTypeLoc, fragmentShadingTypeLoc, transformationMatrixLoc;

var xPos = -1;			//initialize variables for the camera, note that sun is not at the origin
var yPos = -30;
var zPos = 20;
var azim = 0.0;
var pitch = -60.0;
var attached = false;

var identityMatrix = 	//useful identity matrix
[
	vec4(1,0,0,0),
	vec4(0,1,0,0),
	vec4(0,0,1,0),
	vec4(0,0,0,1)
]

identityMatrix.matrix = true;

var planetMatricies = [];	//initialize planet locations

planetMatricies.push(identityMatrix);
planetMatricies.push(identityMatrix);
planetMatricies.push(identityMatrix);
planetMatricies.push(identityMatrix);
planetMatricies.push(identityMatrix); //for the orbiting camera
planetMatricies.push(identityMatrix); //for the moon
var moonRotationMatrix = identityMatrix; //for the moon's secondary rotation

function setupPlanets(){		//create the planets, moon, and orbiting camera's locaitons and scales
	planetMatricies[0] = mult(scale(2, 2, 2), planetMatricies[0]);
	planetMatricies[0] = mult(translate(10, 0, 0), planetMatricies[0]);
	planetMatricies[1] = mult(scale(5, 5, 5), planetMatricies[1]);
	planetMatricies[1] = mult(translate(20, 0, 0), planetMatricies[1]);
	planetMatricies[2] = mult(scale(1.5, 1.5, 1.5), planetMatricies[2]);
	planetMatricies[2] = mult(translate(35, 0, 0), planetMatricies[2]);
	planetMatricies[3] = mult(scale(3, 3, 3), planetMatricies[3]);
	planetMatricies[3] = mult(translate(40, 0, 0), planetMatricies[3]);
	planetMatricies[4] = mult(translate(-40, 0, 0), planetMatricies[4]);
	planetMatricies[5] = mult(translate(6.5, 0, 0), planetMatricies[5]);
}
    
function triangle(a, b, c, smooth) {	//function from book for generating a sphere

     var t1 = subtract(b, a);
     var t2 = subtract(c, a);
     var normal = normalize(cross(t2, t1));
     normal = vec4(normal);
	
	if(smooth){
		normalsArray.push(a[0],a[1], a[2], 0.0);
		normalsArray.push(b[0],b[1], b[2], 0.0);
		normalsArray.push(c[0],c[1], c[2], 0.0);
	}
	else{
		normalsArray.push(normal);
		normalsArray.push(normal);
		normalsArray.push(normal);
	}
	
     pointsArray.push(a);
     pointsArray.push(b);      
     pointsArray.push(c);

     index += 3;
}


function divideTriangle(a, b, c, count, smooth) {	//function from book for generating a sphere
    if ( count > 0 ) {
                
        var ab = mix( a, b, 0.5);
        var ac = mix( a, c, 0.5);
        var bc = mix( b, c, 0.5);
                
        ab = normalize(ab, true);
        ac = normalize(ac, true);
        bc = normalize(bc, true);
                                
        divideTriangle( a, ab, ac, count - 1 );
        divideTriangle( ab, b, bc, count - 1 );
        divideTriangle( bc, c, ac, count - 1 );
        divideTriangle( ab, bc, ac, count - 1 );
    }
    else { 
        triangle( a, b, c , smooth);
    }
}


function tetrahedron(a, b, c, d, n, smooth) {	//function from book for generating a sphere
    divideTriangle(a, b, c, n, smooth);
    divideTriangle(d, c, b, n, smooth);
    divideTriangle(a, d, b, n, smooth);
    divideTriangle(a, c, d, n, smooth);
}

window.onload = function init() {
																//boilerplate code to set up webgl
    canvas = document.getElementById( "gl-canvas" );
    
    gl = WebGLUtils.setupWebGL( canvas );
    if ( !gl ) { alert( "WebGL isn't available" ); }

    gl.viewport( 0, 0, canvas.width, canvas.height );
    gl.clearColor( 0.0, 0.0, 0.0, 1.0 );
    
    gl.enable(gl.DEPTH_TEST);

    //
    //  Load shaders and initialize attribute buffers
    //
	
    program = initShaders( gl, "vertex-shader", "fragment-shader" );
    gl.useProgram( program );
    
	projectionMatrix =  perspective(60, canvas.width/canvas.height, 0.1, 1000);	//initialize the camera

    tetrahedron(va, vb, vc, vd, 4, false);	//generate the two types of spheres used for the planets
	tetrahedron(va, vb, vc, vd, 5, false);

    var nBuffer = gl.createBuffer();	//create and fill geometry and normal buffers
    gl.bindBuffer( gl.ARRAY_BUFFER, nBuffer);
    gl.bufferData( gl.ARRAY_BUFFER, flatten(normalsArray), gl.STATIC_DRAW );
    
    var vNormal = gl.getAttribLocation( program, "vNormal" );
    gl.vertexAttribPointer( vNormal, 4, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vNormal);

    var vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(pointsArray), gl.STATIC_DRAW);
    
    var vPosition = gl.getAttribLocation( program, "vPosition");
    gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);
    
    modelViewMatrixLoc = gl.getUniformLocation( program, "modelViewMatrix" );			//get shader variable locations
	transformationMatrixLoc = gl.getUniformLocation( program, "transformationMatrix" );
	vertexShadingTypeLoc = gl.getUniformLocation( program, "vertexShadingType" );
	fragmentShadingTypeLoc = gl.getUniformLocation( program, "fragmentShadingType" );
	
    gl.uniform4fv( gl.getUniformLocation(program, 
       "lightPosition"),flatten(lightPosition) );
	gl.uniformMatrix4fv(gl.getUniformLocation(program, 
       "projectionMatrix"), false, flatten(projectionMatrix) );
	
	modelViewMatrix = mult(mult(rotate(pitch, [1,0,0]), rotate(azim, [0,1,0])), translate(-xPos, -yPos, -zPos));;
	window.addEventListener("keydown", function (event) { //listen for keystrokes and take the corresponding actions
		switch(event.keyCode) {
			case 37: //"left"
				azim += -1;
			break;
			case 38: //"up"
				pitch += -1;
			break;
			case 39: //"right"
				azim += 1;
			break;
			case 40: //"down"
				pitch += 1;
			break;
			case 81: //"q"
				zPos += -0.25;
			break;
			case 69: //"e"
				zPos += 0.25;
			break;
			case 87: //"w"
				xPos += 0.25 * Math.sin((Math.PI / 180) * azim);
				yPos += 0.25 * Math.cos((Math.PI / 180) * -azim);
			break;
			case 65: //"a"
				xPos += -0.25 * Math.cos((Math.PI / 180) * -azim);
				yPos += -0.25 * Math.sin((Math.PI / 180) * -azim);
			break;
			case 68: //"d"
				xPos += 0.25 * Math.cos((Math.PI / 180) * -azim);
				yPos += 0.25 * Math.sin((Math.PI / 180) * -azim);
			break;
			case 83: //"s"
				xPos += -0.25 * Math.sin((Math.PI / 180) * azim);
				yPos += -0.25 * Math.cos((Math.PI / 180) * -azim);
			break;
			case 82: //"r"
				xPos = -1;
				yPos = -30;
				zPos = 20;
				azim = 0.0;
				pitch = -60.0;
				attached = false;
			break;
			case 84: //"t"
				attached = !attached;
				pitch = -90;
				azim = -90;
		}
		
		//edit the camera location and the perspective based on the new input
		if(attached){
			xPos = 0;
			yPos = 0;
			zPos = 0;
		}
		modelViewMatrix = mult(mult(rotate(pitch, [1,0,0]), rotate(azim, [0,0,1])), translate(-xPos, -yPos, -zPos));
	}, false);
    
	setupPlanets(); //described above
	
	render();
}


function render() {
	
    gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	if(attached){		//first check if the camera is attached
		gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(mult(mult(modelViewMatrix, planetMatricies[4]), translate(5, 0, 0)))); //move it to orbit if it is
	}
	else{
		gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(modelViewMatrix)); //otherwise treat it normally
	}
	
	vertexShadingType = 0;										//each of the following code sections follows the same format:
	fragmentShadingType = 0;									//set the shading type
	gl.uniform1i(vertexShadingTypeLoc, vertexShadingType);
	gl.uniform1i(fragmentShadingTypeLoc, fragmentShadingType);
	
	materialAmbient = vec4( 0.8, .8, .8, 1.0 );					//set the material peroperties in the shader
	materialDiffuse = vec4( 0.8, .8, .8, 1.0 );
	materialSpecular = vec4( 1.0, 1.0, 1.0, 1.0 );
	ambientProduct = mult(lightAmbient, materialAmbient);
    diffuseProduct = mult(lightDiffuse, materialDiffuse);
    specularProduct = mult(lightSpecular, materialSpecular);
	materialShininess = 30.0;
	gl.uniform4fv( gl.getUniformLocation(program, 
       "ambientProduct"),flatten(ambientProduct) );
    gl.uniform4fv( gl.getUniformLocation(program, 
       "diffuseProduct"),flatten(diffuseProduct) );
    gl.uniform4fv( gl.getUniformLocation(program, 
       "specularProduct"),flatten(specularProduct) );	
	gl.uniform1f( gl.getUniformLocation(program, 
       "shininess"),materialShininess );
	planetMatricies[0] = mult(rotate(2, [0, 0, 1]), planetMatricies[0]);				//rotate the planet so it orbits
	gl.uniformMatrix4fv(transformationMatrixLoc, false, flatten(mult(translate(1, 0, 0), planetMatricies[0])));	//set the planet's location in the shader, scoot it right by 1 to match the sun
	for( var i=0; i<3072; i+=3) 							//draw the planet
		gl.drawArrays( gl.TRIANGLES, i, 3 );
															//for all following code blocks, see above except in special cases
	
	vertexShadingType = 1;
	fragmentShadingType = 1;
	gl.uniform1i(vertexShadingTypeLoc, vertexShadingType);
	gl.uniform1i(fragmentShadingTypeLoc, fragmentShadingType);
	
	materialAmbient = vec4( 0.2, 0.5, 0.1, 1.0 );
	materialDiffuse = vec4( 0.2, 0.5, 0.1, 1.0 );
	materialSpecular = vec4( 1.0, 1.0, 1.0, 1.0 );
	ambientProduct = mult(lightAmbient, materialAmbient);
    diffuseProduct = mult(lightDiffuse, materialDiffuse);
    specularProduct = mult(lightSpecular, materialSpecular);
	materialShininess = 30.0;
	gl.uniform4fv( gl.getUniformLocation(program, 
       "ambientProduct"),flatten(ambientProduct) );
    gl.uniform4fv( gl.getUniformLocation(program, 
       "diffuseProduct"),flatten(diffuseProduct) );
    gl.uniform4fv( gl.getUniformLocation(program, 
       "specularProduct"),flatten(specularProduct) );	
	gl.uniform1f( gl.getUniformLocation(program, 
       "shininess"),materialShininess );
	planetMatricies[1] = mult(rotate(1, [0, 0, 1]), planetMatricies[1]);
	gl.uniformMatrix4fv(transformationMatrixLoc, false, flatten(mult(translate(1, 0, 0), planetMatricies[1])));
	for( var i=0; i<3072; i+=3) 
		gl.drawArrays( gl.TRIANGLES, i, 3 );
	
	
	vertexShadingType = 2;
	fragmentShadingType = 2;
	gl.uniform1i(vertexShadingTypeLoc, vertexShadingType);
	gl.uniform1i(fragmentShadingTypeLoc, fragmentShadingType);
	
	materialAmbient = vec4( 0.2, 0.2, 1.0, 1.0 );
	materialDiffuse = vec4( 0.2, 0.2, 1.0, 1.0 );
	materialSpecular = vec4( 1.0, 1.0, 1.0, 1.0 );
	ambientProduct = mult(lightAmbient, materialAmbient);
    diffuseProduct = mult(lightDiffuse, materialDiffuse);
    specularProduct = mult(lightSpecular, materialSpecular);
	materialShininess = 30.0;
	gl.uniform4fv( gl.getUniformLocation(program, 
       "ambientProductF"),flatten(ambientProduct) );
    gl.uniform4fv( gl.getUniformLocation(program, 
       "diffuseProductF"),flatten(diffuseProduct) );
    gl.uniform4fv( gl.getUniformLocation(program, 
       "specularProductF"),flatten(specularProduct) );
	gl.uniform1f( gl.getUniformLocation(program, 
       "shininessF"),materialShininess );
	planetMatricies[2] = mult(rotate(.5, [0, 0, 1]), planetMatricies[2]);
	gl.uniformMatrix4fv(transformationMatrixLoc, false, flatten(planetMatricies[2]));
	for( var i=3072; i<index; i+=3) 
		gl.drawArrays( gl.TRIANGLES, i, 3 );
	
	
	vertexShadingType = 2;
	fragmentShadingType = 2;
	gl.uniform1i(vertexShadingTypeLoc, vertexShadingType);
	gl.uniform1i(fragmentShadingTypeLoc, fragmentShadingType);
	
	materialAmbient = vec4( 0.4, 0.3, 0.3, 1.0 );
	materialDiffuse = vec4( 0.4, 0.3, 0.3, 1.0 );
	materialSpecular = vec4( 1.0, 1.0, 1.0, 1.0 );
	ambientProduct = mult(lightAmbient, materialAmbient);
    diffuseProduct = mult(lightDiffuse, materialDiffuse);
    specularProduct = mult(lightSpecular, materialSpecular);
	materialShininess = 9999.0;
	gl.uniform4fv( gl.getUniformLocation(program, 
       "ambientProductF"),flatten(ambientProduct) );
    gl.uniform4fv( gl.getUniformLocation(program, 
       "diffuseProductF"),flatten(diffuseProduct) );
    gl.uniform4fv( gl.getUniformLocation(program, 
       "specularProductF"),flatten(specularProduct) );
	gl.uniform1f( gl.getUniformLocation(program, 
       "shininessF"),materialShininess );
	planetMatricies[3] = mult(rotate(.25, [0, 0, 1]), planetMatricies[3]);
	planetMatricies[4] = mult(planetMatricies[4], rotate(-.25, [0, 0, 1]));		//special case: rotate the camera to follow this planet
	gl.uniformMatrix4fv(transformationMatrixLoc, false, flatten(mult(translate(1, 0, 0), planetMatricies[3])));
	for( var i=0; i<3072; i+=3) 
		gl.drawArrays( gl.TRIANGLES, i, 3 );
	
	vertexShadingType = 2; //moon!
	fragmentShadingType = 2;
	gl.uniform1i(vertexShadingTypeLoc, vertexShadingType);
	gl.uniform1i(fragmentShadingTypeLoc, fragmentShadingType);
	
	materialAmbient = vec4( 0.5, 0.5, 0.5, 1.0 );
	materialDiffuse = vec4( 0.5, 0.5, 0.5, 1.0 );
	materialSpecular = vec4( 1.0, 1.0, 1.0, 1.0 );
	ambientProduct = mult(lightAmbient, materialAmbient);
    diffuseProduct = mult(lightDiffuse, materialDiffuse);
    specularProduct = mult(lightSpecular, materialSpecular);
	materialShininess = 2.0;
	gl.uniform4fv( gl.getUniformLocation(program, 
       "ambientProductF"),flatten(ambientProduct) );
    gl.uniform4fv( gl.getUniformLocation(program, 
       "diffuseProductF"),flatten(diffuseProduct) );
    gl.uniform4fv( gl.getUniformLocation(program, 
       "specularProductF"),flatten(specularProduct) );
	gl.uniform1f( gl.getUniformLocation(program, 
       "shininessF"),materialShininess );
	planetMatricies[5] = mult(rotate(3, [0, 0, 1]), planetMatricies[5]);
	moonRotationMatrix = mult(rotate(1, [0, 0, 1]), moonRotationMatrix);	//special case: apply the moon's secondary rotation
	gl.uniformMatrix4fv(transformationMatrixLoc, false, flatten(mult(translate(1, 0, 0), mult(moonRotationMatrix, mult(translate(20, 0, 0), planetMatricies[5])))));
	for( var i=0; i<3072; i+=3) 
		gl.drawArrays( gl.TRIANGLES, i, 3 );
	
	vertexShadingType = 3;			// special case: simple shading for the sun, doesn't need to set any variables other than shading type
	fragmentShadingType = 3;
	gl.uniform1i(vertexShadingTypeLoc, vertexShadingType);
	gl.uniform1i(fragmentShadingTypeLoc, fragmentShadingType);
	gl.uniformMatrix4fv(transformationMatrixLoc, false, flatten(translate(1, 0, 0)));
	for( var i=0; i<3072; i+=3) 
		gl.drawArrays( gl.TRIANGLES, i, 3 );

    window.requestAnimFrame(render);
}
