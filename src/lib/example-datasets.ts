import { Car, Coffee, Database } from "lucide-react";

export interface ExampleDataSet {
    id: string;
    name: string;
    description: string;
    icon: React.ComponentType<any>;
    data: string;
}

const irisData = `sepal.length,sepal.width,petal.length,petal.width,variety
5.1,3.5,1.4,.2,Setosa
4.9,3,1.4,.2,Setosa
4.7,3.2,1.3,.2,Setosa
7,3.2,4.7,1.4,Versicolor
6.4,3.2,4.5,1.5,Versicolor
6.9,3.1,4.9,1.5,Versicolor
6.5,3,5.2,2,Virginica
6.3,3.4,5.6,2.4,Virginica
5.8,2.7,5.1,1.9,Virginica
`;

const tipsData = `total_bill,tip,sex,smoker,day,time,size
16.99,1.01,Female,No,Sun,Dinner,2
10.34,1.66,Male,No,Sun,Dinner,3
21.01,3.5,Male,No,Sun,Dinner,3
23.68,3.31,Male,No,Sun,Dinner,2
24.59,3.61,Female,No,Sun,Dinner,4
25.29,4.71,Male,No,Sun,Dinner,4
8.77,2,Male,No,Sun,Dinner,2
26.88,3.12,Male,No,Sun,Dinner,4
15.04,1.96,Male,No,Sun,Dinner,2
14.78,3.22,Male,No,Sun,Dinner,2
`;

const carsData = `mpg,cylinders,displacement,horsepower,weight,acceleration,model_year,origin,car_name
18,8,307,130,3504,12,70,USA,"chevrolet chevelle malibu"
15,8,350,165,3693,11.5,70,USA,"buick skylark 320"
18,8,318,150,3436,11,70,USA,"plymouth satellite"
16,8,304,150,3433,12,70,USA,"amc rebel sst"
17,8,302,140,3449,10.5,70,USA,"ford torino"
27,4,97,88,2130,14.5,70,Japan,"datsun pl510"
26,4,108,93,2391,15.5,70,Europe,"bmw 2002"
25,4,104,95,2375,17.5,70,Europe,"saab 99e"
24,4,121,113,2234,12.5,70,Europe,"volkswagen 1131 deluxe sedan"
22,6,198,95,2833,15.5,70,USA,"plymouth duster"
18,6,199,97,2774,15.5,70,USA,"amc hornet"
21,6,200,85,2587,16,70,USA,"ford maverick"
`;


export const exampleDatasets: ExampleDataSet[] = [
    {
        id: 'iris',
        name: 'Iris Flowers',
        description: '붓꽃 품종(setosa, versicolor, virginica)에 대한 꽃받침과 꽃잎 측정 데이터입니다.',
        icon: Database,
        data: irisData
    },
    {
        id: 'tips',
        name: 'Tips',
        description: '식당 직원이 받은 팁과 고객, 청구서 정보에 대한 데이터입니다.',
        icon: Coffee,
        data: tipsData
    },
    {
        id: 'cars',
        name: 'Cars',
        description: '다양한 자동차 모델의 연비(MPG) 및 기타 사양에 대한 데이터입니다.',
        icon: Car,
        data: carsData
    }
]
