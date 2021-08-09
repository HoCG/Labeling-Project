 해당 프로젝트는 인턴기간동안(2021년 7월부터 8월 5일경까지 진행) 제가 일부를 맡은 프로젝트입니다. 이 프로젝트는 웹 페이지의 일부분을 차지하게 되는 프로젝트이며 타입스크립트로 동작하고 화면에 보여지는 부분에 경우를 vue로 보여지도록 만들었습니다. 문장에 드래그(하이라이팅)를 하면 드래그 된 문장에 라벨링을 해주는 프로젝트입니다. 이렇게 드래그된 문장의 라벨링을 삭제시킬수도 있으며 라벨링이 겹치도록 하는것 또한 가능합니다. 
 
![스크린샷(76)](https://user-images.githubusercontent.com/52379503/128648387-ad211022-e9d1-4cc3-aa5f-205889793649.png)

또한 이 프로젝트는 단순히 하드코딩된 문장을 드래그 하는것이 아닌, JSON파일을 읽어와서 문장을 드래그하는 방식입니다. 이뿐만 아니라 이렇게 라벨링된 문장의 정보를 JSON내에 정보로 담아서 파일로 저장하는것 또한 가능합니다.

![dd](https://user-images.githubusercontent.com/52379503/128648532-39d529af-a396-48a9-abcd-9088c5a5d02f.PNG)

백엔드를 구현하지 않았기 때문에 로컬 환경에서 프로그램을 진행해야하고 따라서 아래의 절차를 거쳐서 진행하면 프로그램이 정상 동작합니다.


## Project setup
```
yarn install
```

### Compiles and hot-reloads for development

yarn run serve
```

### Compiles and minifies for production
```
yarn run build
```

### Run your tests
```
yarn run test
```

### Lints and fixes files
```
yarn run lint
```

### Customize configuration
See [Configuration Reference](https://cli.vuejs.org/config/).
