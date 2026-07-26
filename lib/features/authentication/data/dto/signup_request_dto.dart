/// DTO for signup HTTP POST payload
class SignupRequestDto {
  final String username;
  final String email;
  final String password;
  final String passwordConfirm;

  const SignupRequestDto({
    required this.username,
    required this.email,
    required this.password,
    required this.passwordConfirm,
  });

  Map<String, dynamic> toJson() => {
        'username': username,
        'email': email,
        'password': password,
        'password_confirm': passwordConfirm,
      };
}
