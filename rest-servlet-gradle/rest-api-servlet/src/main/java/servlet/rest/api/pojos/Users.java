package servlet.rest.api.pojos;

public class Users {
	private String name;
	private String surname;
	private int age;
	private int height;
	private Family family;
	
	public Users (String name, String surname, int age, int height, Family family) {
		this.name = name;
		this.surname = surname;
		this.age = age;
		this.height = height;
		this.family = family;
	};
	public int getHeight() {
		return height;
	}
	public void setHeight(int height) {
		this.height = height;
	}
	public Family getFamily() {
		return family;
	}
	public void setFamily(Family family) {
		this.family = family;
	}
	public int getAge() {
		return age;
	}
	public void setAge(int age) {
		this.age = age;
	}
	public String getSurname() {
		return surname;
	}
	public void setSurname(String surname) {
		this.surname = surname;
	}
	public String getName() {
		return name;
	}
	public void setName(String name) {
		this.name = name;
	}
}
