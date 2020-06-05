```js
///////////////////////////////////////////////

let r = inputNumber("请输入圆的半径", 1);

let area = Math.PI * r * r;
let perimeter = 2 * Math.PI * r;

print("面积是", area);
print("周长是", perimeter);


///////////////////////////////////////////////

let a = inputNumber("请输入分数", 60);

if( a >= 90 ) 
{
  print("你太棒了");
} 
else 
{
  if (a >= 60) 
  {
    print("恭喜，你及格啦");
  } 
  else 
  {
    print("啊，你没及格");
  }
}

///////////////

let sum = 0;
sum = sum + 1;
sum = sum + 2;
sum = sum + 3;
sum = sum + 4;
sum = sum + 5;
......
sum = sum + a;
print(sum);


for(循环变量初始化语句; 循环执行条件; 循环结束后的递增语句) {
  循环体 
}

let a = inputNumber("请输入a", a);

for(let i = 0; i < a; i++) {
  ...
}

for(let i = 1; i <= a; i++) {
  ...
}

===================================

let a = 2;

let p0 = new Promise(function(resolve, reject){print("fuck"); reject(3);});

a = a + 1;

===================================

let a = inputNumber("请输入a", 0);
let sum = 0;

function summer() {
  sum = 0; 
}

for(let i = 1; i <= a; i++) {
  sum = sum + i;
  if (Math.floor(sum / 2) === sum / 2) 
  {
    print("偶数sum", sum);
  }
  else
  {
    print("奇数sum", sum);
  }
}

print("最终和为", sum);

===================================
print(Math.floor(- 5 / 2));
print(Math.floor(5 / 2));
print(Math.floor(3));
print(Math.floor(- 3));

if( 2 / 2 === 1 ) {
  print(" 2 / 2 等于 1");
}

if( 2 / 2 !== 1 ) {
  print(" 2 / 2 不等于 1");
}

=================================

for(let i = 0; i < 5; i++) {
  print("哈哈", i);
}

print("=================");

for(let i = 1; i <= 5; i++) {
  print("哈哈", i);
}

===================================

a = 5;

let i = 0;
if(i < a) {
  print("哈哈", i);
  i++;
  if(1 < 5) {
    print("哈哈", i);
    i++;
    if(2 < 5) {
      print("哈哈", i);
      i++;
    }
  }
}

循环变量初始化语句;
if(循环执行条件) 
{
  循环体
  循环结束后的递增语句;
  if(循环执行条件) 
  {
    循环体
    循环结束后的递增语句;
    if(循环执行条件) 
    {
      循环体
      ......
    }
  }
} 
```