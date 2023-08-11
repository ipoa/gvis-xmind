;(function() {
	var GraphVisXmind = function(domId,treeData,option) {
		this.domId = domId;
		this.defaultOption={
			nodePadding:30,
			levelSpace:150,
			nodeSpace:10,
			animate:false,
			type:'lcr',//lr,rl
			themeColor:'100,100,250',
			/* onClick:null, //节点点击事件回调
			ondblClick:null, //节点双击事件回调
			onMouseUp: null, //节点的鼠标抬起事件
			onMouseDown:null, //节点的鼠标按下事件
			onMouseOver:null, //节点的鼠标划过事件
			onMouseOut:null, //节点的鼠标划出事件
			onMousedrag:null, //节点拖动事件回调
			noElementClick:null,//空白区域点击事件
			appendChildNode:null//动态追加叶子节点 */
		};
		this.option = this.deepExtend(this.defaultOption,option,true,true);
		
		this.treeData = treeData;//注册的数据
		this.visNodes=[]; //可视化节点对象
		this.idMapChildNode={};//id与子节点的缓存
		this.idMapNode={};//id与node的缓存
		this.visgraph=null;
		this.rootVisNode=null;
		this.currentNode=null;
		this.newChildren=[]; //新增节点

		this.init();
	};

	//初始化画布及图数据
	GraphVisXmind.prototype.init = function(){
		this.visgraph = this.initGraphVis(this.domId);
		/* if(this.option.animate){
			this.visgraph.switchAnimate(true);
		} */
		this.rootVisNode = this.buildXmindNode(this.treeData);
		this.visgraph.setZoom();
	};
	
	//初始化GraphVis全局对象
	GraphVisXmind.prototype.initGraphVis=function(visDomId){
		var self = this;
		return new VisGraph(document.getElementById(visDomId),
			{
				node: { //节点的默认配置
					label: { //标签配置
						show: true, //是否显示
						color: '20,20,20', //字体颜色
						font: 'normal 18px Yahei',
						textPosition: 'Middle_Center' 
					},
					shape: 'rect', 
					width: 150, //节点宽度
					height: 44, //节点高度
					color: '255,255,255', //节点颜色
					borderColor: '230,230,245', //边框颜色
					borderWidth:2,
					borderRadius:3,
					selected:{
						borderColor: self.option.themeColor,
						borderWidth:3
					}
				},
				link: { //连线的默认配置
					label: { 
						show: false,
						color: '250,250,250',
						font: 'normal 13px Arial'
					},
					lineType: 'hbezier', //连线类型,direct,hlink,hbezier
					colorType: 'defined',
					color:'220,220,240',
					alpha:0.9,
					lineWidth:2,
					showArrow:true,
					arrowType:'triangle',
					selected:{
						color: self.option.themeColor,
						alpha:1
					}
				},
				wheelZoom: 0.8, //开启鼠标滚轮缩放
				highLightNeiber: false, //相邻节点高亮开关
				noElementClick: function(event, graphvis) {
					if (self.option.hasOwnProperty('noElementClick')) {
						var noElementClick = self.option['noElementClick'];
						if(typeof(noElementClick) === 'function'){
							noElementClick(event, graphvis);
						}
					}
				}
			}
		);
	};
	
	//重新加载指定数据
	GraphVisXmind.prototype.reloadData = function(treeData){
		this.treeData = treeData;
		this.visgraph.clearAll();
		this.visNodes=[];
		this.idMapChildNode={};//id与子节点的缓存
		this.idMapNode={};//id与node的缓存
		this.rootVisNode=null;
		this.currentNode=null;
		this.rootVisNode = this.buildXmindNode(this.treeData);
		this.visgraph.setZoom();
	};

	//重设配置项
	GraphVisXmind.prototype.resetOption = function(option){
		this.option = this.deepExtend(this.defaultOption,option, true, true);
		this.reloadData(this.treeData);
	};
	
	//构建脑图节点分布
	GraphVisXmind.prototype.buildXmindNode = function(rootNode){
		var self = this;
		var rootVisNode = self.createVisNode(rootNode,null,'right');
		rootVisNode.cx = this.visgraph.canvas.width/2;
		rootVisNode.cy = this.visgraph.canvas.height/2;
		rootVisNode.finishX=rootVisNode.cx;
		rootVisNode.finishY=rootVisNode.cy;
		rootVisNode.fillColor=self.option.themeColor;//背景色
		rootVisNode.fontColor='250,250,250';//字体颜色
		rootVisNode.borderColor=self.option.themeColor;//边框颜色
		rootVisNode.edgeNum = rootNode.edgeNum||2;//子节点的数量
		rootVisNode.maxChildW=0;
		rootVisNode.isRootNode=true; //是否为根节点
		rootVisNode.fillStyle=self.createStepColor(rootVisNode);
		
		this.rootVisNode = rootVisNode;
		this.visNodes.push(rootVisNode);
		
		var subTree = self.splitSubTree(rootNode.children||[]);
		this.buildVisTreeNode({children:subTree.rightNodes},rootVisNode,'right');
		this.layout(rootVisNode,this.option.levelSpace,this.option.nodeSpace,'right');
		
		var rootNodeY=rootVisNode.finishY;	
		this.buildVisTreeNode({children:subTree.leftNodes},rootVisNode,'left');
		this.layout(rootVisNode,this.option.levelSpace,this.option.nodeSpace,'left');
		
		var rootNodeY1=rootVisNode.finishY;
		var shiftOffsetY = (rootNodeY1 - rootNodeY);
		this.shiftLeftTreeNode(rootVisNode.leftSubNodes,shiftOffsetY);
		rootVisNode.finishY = rootNodeY;
		
		if(self.option.animate){			
			self.visNodes.forEach((node)=>{
				node.x = rootVisNode.finishX;
				node.y = rootVisNode.finishY;
				
				self.visgraph.animate({
				   targets: node,
				   x: node.finishX,
				   cy: node.finishY,
				   duration: 800,
				   easing: 'easeInQuad',
				   complete:function(){
				   }
				});
			});
		}else{
			self.visNodes.forEach((node)=>{
				node.x = node.finishX;
				node.cy = node.finishY;
			});
		}
		//self.visgraph.moveNodeToCenter(self.rootVisNode);
		this.drawLine(rootVisNode);

		return rootVisNode;
	};
	
	//绑定节点事件
	GraphVisXmind.prototype.bindEvent=function(node){
		var self = this;
		node.click(function(event) {
			self.clickNode(this);
			
			if(!this.selCtrlNode){
				if (self.option.hasOwnProperty('onClick')) {
					var onClick = self.option['onClick'];
					if(typeof(onClick) === 'function'){
						onClick(event, this);
					}
				}
			}
			
		});
			
		node.dbclick(function(evt) {
			if (self.option.hasOwnProperty('ondblClick')) {
				var ondblClick = self.option['ondblClick'];
				if(typeof(ondblClick) === 'function'){
					ondblClick(event, this);
				}
			}
		});
			
		node.mousedrag(function(evt) {
			if (self.option.hasOwnProperty('onMousedrag')) {
				var onMousedrag = self.option['onMousedrag'];
				if(typeof(onMousedrag) === 'function'){
					onMousedrag(event, this);
				}
			}
		});
			
		node.mouseup(function(evt) {
			if (self.option.hasOwnProperty('onMouseUp')) {
				var onMouseUp = self.option['onMouseUp'];
				if(typeof(onMouseUp) === 'function'){
					onMouseUp(event, this);
				}
			}
		});
			
		node.mousedown(function(evt) {
			if (self.option.hasOwnProperty('onMouseDown')) {
				var onMouseDown = self.option['onMouseDown'];
				if(typeof(onMouseDown) === 'function'){
					onMouseDown(event, this);
				}
			}
		});
			
		node.mouseover(function(evt) {
			if (self.option.hasOwnProperty('onMouseOver')) {
				var onMouseOver = self.option['onMouseOver'];
				if(typeof(onMouseOver) === 'function'){
					onMouseOver(event, this);
				}
			}
		});
			
		node.mouseout(function(evt) {
			if (self.option.hasOwnProperty('onMouseOut')) {
				var onMouseOut = self.option['onMouseOut'];
				if(typeof(onMouseOut) === 'function'){
					onMouseOut(event, this);
				}
			}
		});
	};

    //点击节点效果
	GraphVisXmind.prototype.clickNode=function(node){
		var self = this;
		self.currentNode=node;
		
		//如果选中的是控制点
		if(node.selCtrlNode && node.hasChild){
			if((node.outLinks||[]).length==0){
				if (self.option.hasOwnProperty('appendChildNode')) {
					var appendChildNode = self.option['appendChildNode'];
					if(typeof(appendChildNode) === 'function'){
						appendChildNode(node);
					}
				}else{
					self.expendChild(node,self.idMapChildNode[node.id]);
				}
			}else{
				self.contractChild(node);
			}
		}else{
			var preLevelNodes=[node];
			self.findAllPreLevelNodes(node,preLevelNodes);
			preLevelNodes.forEach((preNode)=>{
				self.selectedElement(preNode);
				(preNode.outLinks||[]).forEach((link)=>{
					if(preLevelNodes.indexOf(link.target) != -1){
						self.selectedElement(link);
					}
				});
			});
		}
	};
	
	//查找所有上级节点
	GraphVisXmind.prototype.findAllPreLevelNodes = function(node,preLevelNodes=[]){
		var self = this;
		(node.inLinks||[]).forEach((link)=>{
			preLevelNodes.push(link.source);
			self.findAllPreLevelNodes(link.source,preLevelNodes);
		});
	};
	
	//选中指定元素
	GraphVisXmind.prototype.selectedElement = function(element){
		element.selected = true;
		this.visgraph.scene.addToSelected(element);
	};
				
	//构建可视化叶子节点
	GraphVisXmind.prototype.buildVisTreeNode=function(treeNode,parentNode,direct='right'){
		var self = this;
		(treeNode.children||[]).forEach((child,index)=>{
			var subNode = self.createVisNode(child,parentNode,direct);
			self.buildVisTreeNode(child,subNode,direct);
		});
	};
	
	//创建可视化节点对象
	GraphVisXmind.prototype.createVisNode = function(child,parentNode,direct){
		var self = this;
		var subNode = self.visgraph.addNode({id:child.id,label:child.label||child.name});
		subNode.leftSubNodes=[];
		subNode.rightSubNodes=[];
		subNode.directType=direct;
		subNode.nodePadding = self.option.nodePadding/2;//节点内边距
		subNode.edgeNum = child.edgeNum||0;
		subNode.hasChild= subNode.edgeNum > 0;

		//设置告警信息
		if(child.warnText){
			subNode.height += 30; //加上个定高度写提示
			subNode.warnText = child.warnText;
		}
		subNode.width = this.getTextWidth(subNode);//节点宽度计算
		subNode.drawNode=self.drawRectNode;//绘制自定义节点
		subNode.isInBound = function(x, y) {
			if(this.hasChild){
				this.selCtrlNode = false;
				var pos = self.findControlPosition(this);
				if(((x-pos.x)*(x-pos.x) + (y-pos.y)*(y-pos.y))< (pos.radius*pos.radius)){
					this.selCtrlNode = true;
					return true;
				}
			}
			return x > this.cx - this.width / 2 && x < this.cx + this.width / 2 && y > this.cy - this.height / 2 &&y < this.cy + this.height / 2;
		};
		
		if(parentNode){
			if(direct == 'right'){
				parentNode.rightSubNodes.push(subNode);
			}else{
				parentNode.leftSubNodes.push(subNode);
			}
		}
		self.bindEvent(subNode);
		self.visNodes.push(subNode);
		return subNode;
	};
	
	//重新加载布局
	GraphVisXmind.prototype.reloadLayout = function(treeData,isAppend){
		var self = this;
		self.treeData = treeData;
		self.idMapNode={};//id与node的缓存
		
		self.buildVirtualXmind(self.treeData);
		if(isAppend){
			if(self.currentNode.isRootNode){
				var subTree = self.splitSubTree(self.newChildren);
				self.buildVisTreeNode({'children':subTree.rightNodes},self.currentNode,'right');
				self.buildVisTreeNode({'children':subTree.leftNodes},self.currentNode,'left');
			}else{
				self.buildVisTreeNode({'children':self.newChildren},self.currentNode,self.currentNode.directType);
			}
			self.drawLine(self.currentNode);
		}
		
		self.visNodes.forEach((node) =>{
			var newPosNode = this.idMapNode[node.id];
			if(newPosNode){
				node.x = newPosNode.finishX;
				node.cy = newPosNode.finishY;
			}
		});
		
		self.visgraph.setZoom();//缩放居中
	};
	
	//构建虚拟的脑图
	GraphVisXmind.prototype.buildVirtualXmind = function(rootNode){
		var self = this;
		
		var subTree = self.splitSubTree(rootNode.children||[]);
		var rootVitaulNode = {id:rootNode.id,label:rootNode.name};
		rootVitaulNode.leftSubNodes=[];
		rootVitaulNode.rightSubNodes=[];
		rootVitaulNode.maxChildW=0;
		rootVitaulNode.height = 44;
		rootVitaulNode.cheight = rootVitaulNode.height;
		rootVitaulNode.width = this.getTextWidth(rootVitaulNode);//计算宽度
		rootVitaulNode.finishX=this.visgraph.canvas.width/2;
		rootVitaulNode.finishY=this.visgraph.canvas.height/2;
		
		this.buildVirtualSubNode({children:subTree.rightNodes},rootVitaulNode,'right');
		this.layout(rootVitaulNode,this.option.levelSpace,this.option.nodeSpace,'right');
		
		var rootNodeY=rootVitaulNode.finishY;	
		this.buildVirtualSubNode({children:subTree.leftNodes},rootVitaulNode,'left');
		this.layout(rootVitaulNode,this.option.levelSpace,this.option.nodeSpace,'left');
		
		var rootNodeY1=rootVitaulNode.finishY;
		var shiftOffsetY = (rootNodeY1 - rootNodeY);
		this.shiftLeftTreeNode(rootVitaulNode.leftSubNodes,shiftOffsetY);
		rootVitaulNode.finishY = rootNodeY;
		
		self.idMapNode[rootNode.id]=rootVitaulNode;
	
		return rootVitaulNode;
	};
	
	//拆分子树
	GraphVisXmind.prototype.splitSubTree = function(rootChildren){
		var self = this;
		var half = Math.ceil(rootChildren.length / 2);
		var rightChildNodes = [];
		var leftChildNodes = [];
		
		if(self.option.type == 'lcr'){
			rootChildren.forEach(function(child,index) {
				if (index < half){
					rightChildNodes.push(child);
				} else{
					leftChildNodes.push(child);
				}
			});
		}else if(self.option.type == 'lr'){
			rootChildren.forEach(function(child,index) {
				rightChildNodes.push(child);
			});
		}else if(self.option.type == 'rl'){
			rootChildren.forEach(function(child,index) {
				leftChildNodes.push(child);
			});
		}
		
		return {
			leftNodes:leftChildNodes,
			rightNodes:rightChildNodes
		};
	};
	
	//构建虚拟的叶子节点
	GraphVisXmind.prototype.buildVirtualSubNode=function(treeNode,parentNode,direct='right'){
		var self = this;
		(treeNode.children||[]).forEach((child,index)=>{
			var subNode = {id:child.id,label:child.name};
			subNode.leftSubNodes=[];
			subNode.rightSubNodes=[];
			subNode.maxChildW=0;
			subNode.directType=direct;
			subNode.height = 44;
			//设置告警信息
			if(child.warnText){
				subNode.height += 30; //加上个定高度写提示
				subNode.warnText = child.warnText;
			}
			subNode.width = this.getTextWidth(subNode);//节点宽度计算
			
			if(direct == 'right'){
				parentNode.rightSubNodes.push(subNode);
			}else{
				parentNode.leftSubNodes.push(subNode);
			}
			self.idMapNode[subNode.id]=subNode;
			self.buildVirtualSubNode(child,subNode,direct);
		});
	};
	
	//获取控制节点的位置
	GraphVisXmind.prototype.findControlPosition=function(node){
		var offsetX = node.width/2;
		var barBorderWidth = 2;
		var barSize = 8;
		var barOffset = barSize+barBorderWidth*2;
		if(node.directType =='left'){
			offsetX = -offsetX;
			barOffset = -barOffset+barBorderWidth;
		}else{
			barOffset = barSize+barBorderWidth;
		}
		return {
			x:node.cx + offsetX+barOffset,
			y:node.cy,
			radius:8
		};
	};

	//绘制可视化连线
	GraphVisXmind.prototype.drawLine=function(rootNode){
		var self =  this;
		var subNodes = rootNode.leftSubNodes.concat(rootNode.rightSubNodes);
		subNodes.forEach((node,i)=>{
			var exsistLink = self.visgraph.links.filter(link=>{
				return link.source.id == rootNode.id && link.target.id==node.id;
			})[0];
			if(exsistLink){
				exsistLink.arrowType='triangle';
				exsistLink.drawLine=self.drawDefinedLine;
			}else{
				var edge = self.visgraph.addEdge({source:rootNode.id,target:node.id});
				if(edge){
					edge.arrowType='triangle';
					edge.drawLine=self.drawDefinedLine;
				}
			}
			self.drawLine(node);
		});
	};
	
	//绘制自定义连线
	GraphVisXmind.prototype.drawDefinedLine = function(ctx) {
		var source = this.source,target = this.target;
		var sourceY = source.cy;
		var sourceX = source.cx;
		
		if(!source.isRootNode){
			sourceX = source.cx-source.width/2;
			if(source.directType =='right'){
				sourceX = source.cx+source.width/2;
			}
		}else{
			if(source.cx > target.cx){
				sourceX = source.x;
			}else{
				sourceX = source.x + source.width;
			}
		}
		
		var targetX = target.cx,targetY = target.cy;
		var radius = 0;
		if (this.showArrow) {
			targetX = target.cx-((target.width/2 + target.borderWidth/2)*target.scaleX)-this.getArrowRadius(),
			targetY = target.cy,
			radius = this.getTargetBorderPoint();
			if (sourceX > target.cx) {
				targetX = target.cx +((target.width/2+target.borderWidth/2)*target.scaleX)+this.getArrowRadius();
				radius = -radius;
			}
		}
	
		var x3 = (sourceX + targetX) * 0.5,
			y3 = sourceY,
			x4 = (sourceX + targetX) * 0.5,
			y4 = targetY;

		ctx.beginPath();
		this.setLineStyle(ctx);
		ctx.moveTo(sourceX, sourceY);
		ctx.bezierCurveTo(x3, y3, x4, y4, targetX, targetY);
		ctx.stroke();
		ctx.closePath();
	
		this.path = [];
		this.bezierPoints = [sourceX, sourceY, x3, y3, x4, y4, targetX, targetY];
	
		if (this.showArrow) {
			this.paintSpecialArrow(ctx, {
				x: targetX,
				y: targetY
			}, {
				x: target.cx - radius,
				y: target.cy
			});
		}
	};
	
	//画矩形节点
	GraphVisXmind.prototype.drawRectNode=function(ctx){
		//绘制节点区域形状
		var width = this.width;
		var height = this.height;
		
		var r2d = Math.PI / 180;
		var r = this.borderRadius;
		var x = -width/2,y =-height/2;		
		
		ctx.save();
		ctx.beginPath();
		ctx.moveTo(x + r, y);
		ctx.lineTo(x + width - r, y);
		ctx.arc(x + width - r, y + r, r, r2d * 270, r2d * 360, false);
		ctx.lineTo(x + width, y + height - r);
		ctx.arc(x + width - r, y + height - r, r, 0, r2d * 90, false);
		ctx.lineTo(x + r, y + height);
		ctx.arc(x + r, y + height - r, r, r2d * 90, r2d * 180, false);
		ctx.lineTo(x, y + r);
		ctx.arc(x + r, y + r, r, r2d * 180, r2d * 270, false);
		ctx.closePath();
		
		if ((this.showSelected || this.selected) && this.selectedBorderWidth > 0) {
			ctx.lineWidth = this.borderWidth+this.selectedBorderWidth;
			ctx.strokeStyle = `rgba(${this.selectedBorderColor},${this.alpha*this.selectedBorderAlpha})`;
			ctx.stroke();
		}
		
		if (!this.selected && !this.showSelected  && this.borderWidth > 0) {
			ctx.lineWidth = this.borderWidth;
			ctx.strokeStyle = this.strokeStyle ? this.strokeStyle : `rgba(${this.borderColor},${this.alpha*this.borderAlpha})`;
			ctx.stroke();
		}
		
		if(this.fillColor){
			ctx.fillStyle = this.fillStyle ? this.fillStyle : `rgba(${this.fillColor},${this.alpha})`;
			ctx.fill();
		}
		ctx.restore();		
		
		//绘制警告文字
		if(this.warnText){
			ctx.save();
			ctx.font = this.font;
			var singleTextWidth = ctx.measureText("国").width;
			ctx.fillStyle = `rgba(${this.fontColor},${this.alpha})`;
			ctx.fillText(this.label,-this.width/2+this.nodePadding,-singleTextWidth/2);
			ctx.restore();
			
			ctx.save();
			ctx.font = 'normal 14px Yahei';
			var sigleWarnTextWidth = ctx.measureText("国").width;
			ctx.fillStyle = 'rgba(150,150,150,1)';
			ctx.fillText(this.warnText,-this.width/2+this.nodePadding+15,sigleWarnTextWidth+10);
			ctx.restore();
			
			//绘制符号圆圈
			ctx.save();
			ctx.beginPath();
			ctx.translate(-this.width/2+this.nodePadding+5,sigleWarnTextWidth+5);
			ctx.arc(0,0,6,0,Math.PI*2,false);
			ctx.closePath();
			ctx.fillStyle = 'rgba(225,212,25,1)';
			ctx.fill();
			
			//绘制符号文字
			ctx.textBaseline="middle";
			ctx.textAlign="center";
			ctx.fillStyle = 'rgba(250,250,250,1)';
			ctx.fillText('!',0,0);
			ctx.restore();
			
			//绘制横线
			ctx.save();
			ctx.beginPath();
			ctx.lineWidth = 1;
			ctx.strokeStyle = 'rgba(150,150,150,0.6)';
			ctx.moveTo(-this.width/2+this.nodePadding,5);
			ctx.lineTo(this.width/2-this.nodePadding,5);
			ctx.stroke();
			ctx.restore();
		}else{
			ctx.save();
			ctx.font = this.font;
			ctx.textBaseline="middle";
			ctx.textAlign="center";
			ctx.fillStyle = `rgba(${this.fontColor},${this.alpha})`;
			ctx.fillText(this.label,0,2);
			ctx.restore();
		}
		this.paintHeadTip(ctx);//绘制头部提示
		
		//画控制节点
		if(this.hasChild){
			var contract = (this.outLinks||[]).length==0;
			var fillStyle = 'rgba(255,255,255,1)';
			var fontStyle = 'rgba(100,100,250,1)';
			if(contract){
				fontStyle = 'rgba(255,255,255,1)';
				fillStyle = 'rgba(100,100,250,1)';
			}
			
			var offsetX = this.width/2;
			var barBorderWidth = 2;
			var barBorderHeight = 14;
			var barBorderOffSet = barBorderWidth;
			var barSize = 8;
			var barOffset = barSize+barBorderWidth*2;
			
			ctx.save();
			ctx.beginPath();
			if(this.directType =='left'){
				offsetX = -this.width/2;
				barOffset = -barOffset+barBorderWidth;
				barBorderOffSet = -barBorderWidth;
			}else{
				barBorderOffSet=0;
				barOffset = barSize+barBorderWidth;
			}
			ctx.rect(offsetX+barBorderOffSet,-barBorderHeight/2,barBorderWidth,barBorderHeight);
			ctx.fillStyle = 'rgba(100,100,250,1)';
			ctx.fill();
			ctx.closePath();
			ctx.restore();
			
			ctx.save();
			ctx.beginPath();
			ctx.arc(offsetX+barOffset,0,barSize,0,Math.PI*2,false);
			ctx.closePath();
			ctx.lineWidth=this.selCtrlNode?2:1;
			ctx.strokeStyle = 'rgba(100,100,250,1)';
			ctx.fillStyle = fillStyle;
			ctx.fill();
			ctx.stroke();
			
			ctx.font = 'normal 20px Arial';
			ctx.textBaseline="middle";
			ctx.textAlign="center";
			ctx.fillStyle = fontStyle;
			ctx.fillText(contract?'+':'-',offsetX+barOffset,contract?1.5:0);// +=1.5
			
			ctx.restore();
		}
	};
	
	//平移节点坐标
	GraphVisXmind.prototype.shiftLeftTreeNode=function(subNodes,shiftOffsetY){
		var self = this;
		subNodes.forEach((node)=>{
			node.finishY = node.finishY - shiftOffsetY;
			self.shiftLeftTreeNode(node.leftSubNodes||[],shiftOffsetY);
		});
	};
	
	//获取节点在页面上的坐标位置
	GraphVisXmind.prototype.getPositionInDom=function(node){
		var mouseEvent = this.visgraph.getPagePosition(node.cx,node.cy);
		return mouseEvent;
	};
	
	//根据文字长度计算节点的宽度
	GraphVisXmind.prototype.getTextWidth=function(node){
		var self = this;
		var textWidth = 50;
		var ctx = self.visgraph.stage.graphics;
		ctx.save();
		ctx.font = 'normal 18px Yahei';
		textWidth = ctx.measureText(node.label).width;
		if(node.warnText){
			ctx.font = 'normal 16px Yahei';
			textWidth = Math.max(ctx.measureText(node.warnText).width,textWidth);
		}
		ctx.restore();
		return Math.ceil(textWidth)+self.option.nodePadding;
	};
	
	//创建线性渐变色样式
	GraphVisXmind.prototype.createStepColor=function(node){
		var ctx = this.visgraph.stage.graphics;
		
		//横向渐变方式
		var lingrad = ctx.createLinearGradient(-node.width/2,-node.height/2,node.width/2,node.height/2);
		lingrad.addColorStop(0,"rgba(70,165,240,1)");
		lingrad.addColorStop(1,"rgba(65,95,255,1)");
		
		//纵向渐变
		/* var lingrad = ctx.createLinearGradient(0,0,0,node.height/2);
		lingrad.addColorStop(0,"rgba(70,165,240,1)");
		lingrad.addColorStop(1,"rgba(65,95,255,1)"); */
		
		return lingrad;
	};
	
	//执行布局计算
	GraphVisXmind.prototype.layout=function(node,BaseOffsetX=140,BaseOffsetY=10,direct='right'){
		var self = this;
		var offsetY = 0;
		var minY = Infinity,maxY = -Infinity;
		var subNodes = (direct=='right'?node.rightSubNodes:node.leftSubNodes);
		node.cheight = node.height;
		
		var subNodeLength = subNodes.length;
		for(var i = 0; i < subNodeLength; i++) {
			var childNode = subNodes[i];
			if(direct=='right'){
				childNode.finishX = node.finishX + node.width + BaseOffsetX;
			}else{
				childNode.finishX = node.finishX - BaseOffsetX - childNode.width;
			}
			
			//有提示信息的节点高度
			if(childNode.warnText){
				childNode.finishY = node.finishY + offsetY + self.option.nodePadding/2;
			}else{
				childNode.finishY = node.finishY + offsetY;
			}
			
			self.layout(childNode,BaseOffsetX,BaseOffsetY,direct);           
			if(childNode.width > node.maxChildW) {
				node.maxChildW = childNode.width;
			}
						
			node.cheight += childNode.cheight;
			offsetY += (childNode.cheight+BaseOffsetY);
	
			minY = Math.min(minY,childNode.finishY);
			maxY = Math.max(maxY,childNode.finishY);
		}
		
		if(subNodes.length > 0){
			node.finishY = minY+(Math.abs(maxY-minY)/2);
		}
	};
	
	//查找下级子节点
	GraphVisXmind.prototype.deepFindChildNode = function(node,allChildNodes){
		var self = this;
		var outLinks = node.outLinks||[];
		var childNodes = outLinks.map((link)=>{
			return link.target;
		});
		childNodes.forEach((n)=>{
			allChildNodes.push(n);
		});
		childNodes.forEach((n)=>{
			if(!n.contract){
				self.deepFindChildNode(n,allChildNodes);
			}
		});
	};
	
	//收起叶子节点
	GraphVisXmind.prototype.contractChild = function(node){
		var self = this;
		var allChildNodes=[];
		self.deepFindChildNode(node,allChildNodes);
		
		if(self.option.animate){
			allChildNodes.forEach((n)=>{
				(n.inLinks||[]).forEach((link)=>{link.visible=false;});
			});
			
			self.visgraph.animate({
			   targets: allChildNodes,
			   x: node.x,
			   y: node.y,
			   alpha:0,
			   duration: 600,
			   easing: 'easeInQuad',
			   complete:function(){
				   allChildNodes.forEach((tnode)=>{
						self.visgraph.deleteNode(tnode);
				   });
				   
				   self.removeChild(self.treeData,node.id);
				   self.reloadLayout(self.treeData,false);
			   }
			});
		}else{
			allChildNodes.forEach((tnode)=>{
				self.visgraph.deleteNode(tnode);
			});
			
			self.removeChild(self.treeData,node.id);
			self.reloadLayout(self.treeData,false);
		}
	};

	//展开叶子节点
	GraphVisXmind.prototype.expendChild=function(node,children){
		var self = this;
		
		self.appendChild(self.treeData,node.id,children);
		self.reloadLayout(self.treeData,true);
		
		if(self.option.animate){
			var allChildNodes=[];
			self.deepFindChildNode(node,allChildNodes);
			
			allChildNodes.forEach((n)=>{
				n.x = node.x;
				n.y = node.y;
				n.alpha = 0;
				(n.inLinks||[]).forEach((link)=>{link.visible=false;});
			});
			
			allChildNodes.forEach((n)=>{
				var ndd = self.idMapNode[n.id];
				self.visgraph.animate({
				   targets: n,
				   x: ndd.finishX,
				   cy: ndd.finishY,
				   alpha:1,
				   duration: 600,
				   easing: 'easeOutQuad',
				   complete:function(){
					   (n.inLinks||[]).forEach((link)=>{link.visible=true;});
				   }
				});
			});
		}
	};
	
	//移除指定节点
	GraphVisXmind.prototype.removeChild=function(node,nodeId) {
		var self = this;
		if(node.id === nodeId){
			self.idMapChildNode[node.id] = node.children;
			node.children=null;
		}else{
			(node.children||[]).forEach((child,index)=>{
				self.removeChild(child,nodeId);
			});
		}
	};
	
	//追加节点
	GraphVisXmind.prototype.appendChild=function(node,nodeId,children) {
		var self = this;
		if(node.id === nodeId){
			node.children=children||[];
			//node.children=self.idMapChildNode[nodeId]||[];
			self.newChildren = node.children;
		}else{
			(node.children||[]).forEach((child,index)=>{
				self.appendChild(child,nodeId,children);
			});
		}
	};

	GraphVisXmind.prototype.deepExtend=function(a,b,protoExtend,allowDeletion) {
		for (var prop in b) {
			if (b.hasOwnProperty(prop) || protoExtend === true) {
				if (b[prop] && b[prop].constructor === Object) {
					if (a[prop] === undefined) {
						a[prop] = {};
					}
					if (a[prop].constructor === Object) {
						this.deepExtend(a[prop], b[prop], protoExtend);
					} else {
						if ((b[prop] === null) && a[prop] !== undefined && allowDeletion === true) {
							delete a[prop];
						} else {
							a[prop] = b[prop];
						}
					}
				} else if (Array.isArray(b[prop])) {
					a[prop] = [];
					for (let i = 0; i < b[prop].length; i++) {
						a[prop].push(b[prop][i]);
					}
				} else {
					if ((b[prop] === null) && a[prop] !== undefined && allowDeletion === true) {
						delete a[prop];
					} else {
						a[prop] = b[prop];
					}
				}
			}
		}
		return a;
	};
	
	//保存图片
	GraphVisXmind.prototype.saveImage=function(imageName,type) {
		this.visgraph.saveImage(2000,2000,type,imageName);
	};

	if (typeof module !== 'undefined' && typeof exports === 'object') {
		module.exports = GraphVisXmind;
	} else if (typeof define === 'function' && (define.amd || define.cmd)) {
		define(function() {
			return GraphVisXmind;
		});
	} else {
		this.GraphVisXmind = GraphVisXmind;
	}
}).call(this || (typeof window !== 'undefined' ? window : global));