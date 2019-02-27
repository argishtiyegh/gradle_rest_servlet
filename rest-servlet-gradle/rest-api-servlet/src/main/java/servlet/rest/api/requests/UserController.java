package servlet.rest.api.requests;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import servlet.rest.api.pojos.Family;
import servlet.rest.api.pojos.Users;


@RestController
@RequestMapping("/")
public class UserController {
	@GetMapping("/users")
	public Users getUserName() {
		return new Users("Argishti", "Yeghiazaryan", 15, 150, new Family("Gurgen", "Nelli", "Armenia"));
	};
}
