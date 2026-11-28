import fs from 'fs';import {createRequire} from 'module';
const require=createRequire('/tmp/');const acorn=require('acorn'),walk=require('acorn-walk');
const dir=process.argv[2],order=['core','perf','vehicles','busdata','buses','player','world','audio','life','radio','chute','jobs','crew','ui','render','main'];
const decl={},asts={};
for(const [i,n] of order.entries()){const src=fs.readFileSync(`${dir}/js/${n}.js`,'utf8');
  const ast=acorn.parse(src,{ecmaVersion:'latest',sourceType:'script',locations:true});asts[n]=ast;
  for(const s of ast.body){if(s.type=='FunctionDeclaration'||s.type=='ClassDeclaration')decl[s.id.name]=[i,n,s.type];
    if(s.type=='VariableDeclaration')for(const d of s.declarations)walk.simple({type:'Program',body:[]},{});
    if(s.type=='VariableDeclaration')for(const d of s.declarations){const ids=[];(function g(p){if(!p)return;if(p.type=='Identifier')ids.push(p.name);else if(p.type=='ObjectPattern')p.properties.forEach(q=>g(q.value||q.argument));else if(p.type=='ArrayPattern')p.elements.forEach(g);else if(p.type=='AssignmentPattern')g(p.left);else if(p.type=='RestElement')g(p.argument)})(d.id);for(const x of ids){if(decl[x])console.log('DUP',x,n);decl[x]=[i,n,s.kind]}}}}
let bad=0;
for(const [i,n] of order.entries()){
  const refs=[];
  const visit=(node)=>{walk.recursive(node,null,{Function(){},ArrowFunctionExpression(){},FunctionDeclaration(){},FunctionExpression(){},
    Identifier(id){refs.push(id)}},walk.base)};
  // walk.base handles MemberExpression non-computed property? check: base visits property only if computed
  for(const s of asts[n].body){if(s.type=='FunctionDeclaration')continue;visit(s)}
  for(const id of refs){const d=decl[id.name];if(d&&d[0]>i){bad++;console.log(`HAZARD ${n}.js:${id.loc.start.line} uses ${id.name} from later ${d[1]}.js (${d[2]})`)}}
}
console.log('declared',Object.keys(decl).length,'hazards',bad);
