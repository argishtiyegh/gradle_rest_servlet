package servlet.rest.api.pojos;

public class Family {
	private String father;
	private String mother;
	private String location;
	public String getFather() {
		return father;
	}
	
	public Family (String father, String mother, String location) {
		this.father = father;
		this.mother = mother;
		this.location = location;
	};
	public void setFather(String father) {
		this.father = father;
	}
	public String getMother() {
		return mother;
	}
	public void setMother(String mother) {
		this.mother = mother;
	}
	public String getLocation() {
		return location;
	}
	public void setLocation(String location) {
		this.location = location;
	}
};