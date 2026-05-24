class Car:
    def __init__(self,brand, speed):
        self.brand = brand
        self.speed = speed
        
    def plus(self, n):
        self.speed += n

    def get_info(self):
        return self.brand , self.speed
    
    
car = Car('BMW', 120)
car.plus(120)
print(car.get_info())        